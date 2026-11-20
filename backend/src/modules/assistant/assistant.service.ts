/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { runInTenant } from '../../db/pool.js';
import { notifyChange } from '../../shared/events.js';
import { HttpError } from '../../shared/http.js';
import { reminderLine, whenText } from '../appointments/appointments.messages.js';
import { listAppointments } from '../appointments/appointments.repository.js';
import { dateStr, timeStr } from '../appointments/appointments.schema.js';
import { bookAppointment, updateAppointmentDetails } from '../appointments/appointments.service.js';
import { addDays, DAYS_ES, freeSlotsByDay, localNow } from '../appointments/slots.js';
import { createConversation, findConversationByExternalId, updateConversation } from '../conversations/conversations.repository.js';
import { findActiveTenant, type Tenant } from '../platform/tenants.repository.js';
import { getSchedule } from '../schedule/schedule.repository.js';
import type { DaySchedule } from '../schedule/schedule.schema.js';
import { listServices } from '../services/services.repository.js';
import { getSettings } from '../settings/settings.repository.js';
import type { SettingsPatch } from '../settings/settings.schema.js';
import { complete, type ChatMessage } from './ai.js';

export interface IncomingMessage {
  /** JID del chat de WhatsApp (a quien se responde). */
  chatId: string;
  /** Teléfono en dígitos con prefijo, si WhatsApp lo da (con LID puede no venir). */
  phone: string | null;
  name?: string;
  /** Todo lo que escribió seguido, unido en un solo texto para la IA. */
  text: string;
  /** Los mensajes por separado, tal como llegaron (para guardarlos en la conversación). */
  parts?: string[];
}

export type StoredMessage = { id: string; role: 'user' | 'assistant' | 'error'; content: string; timestamp: string; manual?: boolean };
type Draft = { phone?: string; appointmentIds?: string[] };
type Service = { id: string; name: string; durationMinutes: number; price: number; description: string };
type Appt = {
  id: string;
  serviceId: string;
  serviceName: string;
  customerName: string;
  customerContact: string | null;
  date: string;
  time: string;
  durationMinutes: number;
  price: number;
  status: string;
  cancelReason: string | null;
};

export const MAX_STORED_MESSAGES = 200;
const SLOT_DAYS = 14;
const BUSINESS_TYPE_LABELS: Record<string, string> = {
  barberia: 'barbería',
  peluqueria: 'peluquería',
  estetica: 'centro de estética',
  unas: 'salón de uñas',
  spa: 'spa',
  masajes: 'centro de masajes',
  clinica: 'clínica',
  dental: 'clínica dental',
  fisioterapia: 'centro de fisioterapia',
  psicologia: 'consulta de psicología',
  nutricion: 'consulta de nutrición',
  veterinaria: 'veterinaria',
  gimnasio: 'gimnasio',
  tatuajes: 'estudio de tatuajes',
  taller: 'taller',
  asesoria: 'asesoría',
};

/** "Hola", "buenas tardes 👋", "holaaa!"… sin ninguna pregunta: basta con la bienvenida. */
export function isGreetingOnly(text: string): boolean {
  const cleaned = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return /^((hola+|holi+s?|buen(os|as)?( dias| tardes| noches)?|saludos|hey|que tal|ola|alo|hi|hello)\s*)+$/.test(cleaned);
}

export const DEFAULT_WELCOME =
  '¡Hola! 👋 Bienvenido/a a {{negocio}}. Soy el asistente virtual: puedo darte información de servicios, precios y horarios, reservar tu cita o ayudarte con una que ya tengas. ¿En qué te ayudo?';

/** Mensaje de bienvenida configurado (o el de por defecto) con {{negocio}} sustituido. */
export function welcomeText(settings: SettingsPatch, fallbackName: string): string {
  const template = settings.welcomeMessage?.trim() || DEFAULT_WELCOME;
  return template.replaceAll('{{negocio}}', settings.businessName || fallbackName);
}

const answerSchema = z.object({
  reply: z.string().trim().min(1).max(4_000),
  book: z
    .object({ serviceId: z.uuid(), date: dateStr, time: timeStr, fullName: z.string().trim().min(2).max(100) })
    .nullish(),
  cancel: z.object({ appointmentId: z.uuid(), reason: z.string().trim().min(3).max(500) }).nullish(),
});
type Parsed = z.infer<typeof answerSchema>;
export type AssistantAnswer = { reply: string; book: Parsed['book'] | null; cancel: Parsed['cancel'] | null };

/** Lee el JSON que pide el prompt; si el modelo contesta en texto libre, se usa tal cual. */
export function parseAssistantJson(text: string): AssistantAnswer {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const parsed = answerSchema.safeParse(JSON.parse(text.slice(start, end + 1)));
      if (parsed.success) return { reply: parsed.data.reply, book: parsed.data.book ?? null, cancel: parsed.data.cancel ?? null };
    } catch {
      // no era JSON válido: se trata como texto
    }
  }
  return { reply: text.trim(), book: null, cancel: null };
}

const shortDay = (date: string) => `${DAYS_ES[new Date(`${date}T12:00:00Z`).getUTCDay()]} ${date}`;

export interface PromptContext {
  settings: SettingsPatch;
  businessType?: string;
  tz: string;
  services: Service[];
  schedule: DaySchedule[];
  /** Horas libres calculadas por el servidor, por servicio. */
  freeSlots: { serviceId: string; days: { date: string; times: string[] }[] }[];
  /** Citas de este cliente (próximas y canceladas recientes). */
  customerAppointments: Appt[];
  customerName?: string;
  /** Bienvenida que se acaba de enviar en este mismo turno (para no repetir el saludo). */
  welcomeSent?: string;
}

/** Prompt del asistente de WhatsApp con toda la configuración del establecimiento. */
export function buildSystemPrompt(ctx: PromptContext): string {
  const s = ctx.settings;
  const now = localNow(ctx.tz);
  const type = ctx.businessType && BUSINESS_TYPE_LABELS[ctx.businessType];
  const services = ctx.services.length
    ? ctx.services
        .map((x) => `- id=${x.id} | ${x.name} | ${x.durationMinutes} min | $${x.price} USD${x.description ? ` | ${x.description}` : ''}`)
        .join('\n')
    : '(no hay servicios activos: todavía no se pueden reservar citas; ofrece el teléfono del negocio)';
  const hours = ctx.schedule.length
    ? [...ctx.schedule]
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
        .map((d) => `- ${DAYS_ES[d.dayOfWeek]}: ${d.closed || !d.blocks.length ? 'cerrado' : d.blocks.map((b) => `${b.start}-${b.end}`).join(', ')}`)
        .join('\n')
    : '(horario sin configurar)';
  const free = ctx.freeSlots.length
    ? ctx.freeSlots
        .map((f) => {
          const name = ctx.services.find((x) => x.id === f.serviceId)?.name ?? f.serviceId;
          const days = f.days.length ? f.days.map((d) => `  · ${shortDay(d.date)}: ${d.times.join(', ')}`).join('\n') : '  · sin huecos en los próximos 14 días';
          return `- ${name}:\n${days}`;
        })
        .join('\n')
    : '(no hay huecos)';
  const mine = ctx.customerAppointments.length
    ? ctx.customerAppointments.map((a) => `- id=${a.id} | ${reminderLine(a)} | $${a.price} USD | a nombre de ${a.customerName}`).join('\n')
    : '(este cliente no tiene citas próximas)';

  const lines = [
    `Eres el asistente virtual por WhatsApp de "${s.businessName ?? 'el negocio'}"${type ? `, ${type}` : ''}.`,
    'Responde en el idioma del cliente, con mensajes cortos, cálidos y claros, sin markdown (solo texto plano y algún emoji).',
    'No empieces cada mensaje con "Hola": saluda solo una vez al inicio de la conversación y luego ve al grano.',
    'El cliente a veces escribe en varios mensajes seguidos (llegan en líneas separadas): respóndelos todos juntos en una sola respuesta.',
    'Usa únicamente los datos de abajo; no inventes servicios, precios, horarios ni datos del negocio. Si no sabes algo, dilo y ofrece ayuda con las citas.',
    '',
    'ESTILO DE CONVERSACIÓN (para todo tipo de cliente):',
    '- Adáptate al cliente: si escribe formal, trátalo de usted; si es informal, tutéalo. Imita su tono sin exagerar; si escribe con prisa o en pocas palabras, sé breve.',
    '- Responde primero a lo que preguntó y después, si ayuda, añade UNA sola pregunta o siguiente paso. Nunca hagas varias preguntas a la vez.',
    '- Si el mensaje es ambiguo o tiene faltas, deduce lo más probable y confírmalo en lugar de pedir que lo repita. Pide solo el dato que falte.',
    '- Cliente indeciso o que no sabe qué elegir: pregunta qué necesita y recomienda 1 o 2 servicios de la lista, explicando brevemente la diferencia y el precio.',
    '- Cliente molesto o con una queja: reconoce el problema con empatía, no te justifiques, y ofrece una solución o el teléfono del negocio. Nunca discutas.',
    '- Cliente que pregunta precio o duración: dilo directo y propón reservar. No presiones para vender.',
    '- Persona mayor, con dudas o que no domina el móvil: frases sencillas, un paso a la vez, sin tecnicismos.',
    '- Mensajes de voz, imágenes o temas ajenos al negocio: indica con amabilidad que por aquí solo puedes ayudar con texto sobre el negocio y sus citas.',
    '- Urgencias médicas o de seguridad: recomienda llamar a los servicios de emergencia y no sigas con la reserva.',
    '- Si pide hablar con una persona o no puedes resolverlo, da el teléfono del negocio y despídete con cordialidad.',
    '- Nunca des datos de otros clientes. Cierra con calidez cuando la gestión termine ("¡Gracias, hasta pronto!") sin alargar la charla.',
    '',
    'RESERVAR:',
    '- Necesitas servicio, fecha, hora y nombre completo (el teléfono ya lo tienes).',
    '- Ofrece SOLO horas de la lista "Horas libres" de ese servicio; nunca otras.',
    `- Muestra como máximo ${s.maxSlotsShown ?? 6} horas por mensaje.`,
    '- Si la fecha u hora que pide no está libre o el día está cerrado, no te limites a decir que no hay: explícalo con amabilidad y propón enseguida 2 o 3 alternativas concretas, empezando por las más cercanas a lo que pidió (mismo día a otra hora, o los días siguientes). Si no hay nada en 14 días, ofrece el teléfono del negocio.',
    '- Antes de reservar, resume servicio, fecha, hora, precio y nombre, y pide confirmación. Solo cuando confirme, rellena "book".',
    '',
    'CITAS DEL CLIENTE:',
    '- Si pregunta por su cita (cuándo es, a qué hora, dónde, cuánto cuesta…), respóndele con los datos de "Citas de este cliente" a modo de recordatorio: servicio, día, hora, precio y dirección.',
    '- Si tiene varias, nómbralas todas o pregunta a cuál se refiere. Si no tiene ninguna, díselo y ofrece reservar.',
    '- Si quiere cancelar: confirma qué cita es y pídele el motivo. Solo cuando haya dado el motivo y confirme la cancelación, rellena "cancel" con el id exacto de la cita y el motivo.',
    '- Si quiere cambiarla: ofrece horas libres; al confirmar, rellena "cancel" (motivo "Cambio de cita solicitado por el cliente") y "book" con la nueva hora en la misma respuesta.',
    '- Solo puedes cancelar citas de la lista "Citas de este cliente".',
    '',
    'Responde SIEMPRE con un único objeto JSON, sin texto alrededor:',
    '{"reply": "mensaje para el cliente", "book": null, "cancel": null}',
    'book = {"serviceId": "<id exacto>", "date": "AAAA-MM-DD", "time": "HH:MM", "fullName": "Nombre Apellido"}',
    'cancel = {"appointmentId": "<id exacto>", "reason": "motivo del cliente"}',
    ctx.welcomeSent ? `Ya se le ha enviado este saludo, no vuelvas a saludar ni presentarte: "${ctx.welcomeSent}"` : '',
    '',
    `Ahora: ${now.weekday} ${now.date} ${now.time} (zona horaria ${ctx.tz}). Los precios son en dólares (USD).`,
    ctx.customerName ? `Nombre del cliente en WhatsApp: ${ctx.customerName}.` : '',
    '',
    'Datos del establecimiento:',
    `- Nombre: ${s.businessName ?? '(sin nombre)'}`,
    s.address ? `- Dirección: ${s.address}` : '',
    s.phone ? `- Teléfono: ${s.phone}` : '',
    s.businessInfo?.trim() ? `\nInformación e instrucciones del negocio (síguelas):\n${s.businessInfo.trim()}` : '',
    '',
    'Servicios:',
    services,
    '',
    'Horario semanal:',
    hours,
    '',
    `Horas libres (próximos ${SLOT_DAYS} días, ya descontadas las citas ocupadas):`,
    free,
    '',
    'Citas de este cliente:',
    mine,
  ];
  return lines.filter((line, i) => line !== '' || lines[i - 1] !== '').join('\n');
}

export const message = (role: StoredMessage['role'], content: string, extra: Partial<StoredMessage> = {}): StoredMessage => ({
  id: randomUUID(),
  role,
  content,
  timestamp: new Date().toISOString(),
  ...extra,
});

async function activeTenant(slug: string): Promise<Tenant> {
  const tenant = await findActiveTenant(slug);
  if (!tenant) throw new Error(`Negocio "${slug}" no encontrado o desactivado`);
  return tenant;
}

/** "Te puedo ofrecer: lunes 2026-11-24: 10:00, 10:30 · martes …" para cuando una reserva falla. */
function alternativesText(days: { date: string; times: string[] }[]): string {
  if (!days.length) return 'Ahora mismo no me quedan huecos para ese servicio en los próximos días.';
  return `Te puedo ofrecer: ${days
    .slice(0, 3)
    .map((d) => `${shortDay(d.date)} a las ${d.times.slice(0, 3).join(', ')}`)
    .join(' · ')}. ¿Te viene bien alguna?`;
}

/**
 * Responde a un mensaje de WhatsApp: bienvenida en el primer contacto, respuesta de la IA,
 * reserva o cancelación si el cliente lo confirma. Guarda todo en la conversación. Devuelve los mensajes a enviar en orden.
 */
export async function answerMessage(slug: string, msg: IncomingMessage): Promise<string[]> {
  const tenant = await activeTenant(slug);

  return runInTenant(tenant.schema, async () => {
    const conversation =
      (await findConversationByExternalId('whatsapp', msg.chatId)) ??
      (await createConversation(
        { id: randomUUID(), channel: 'whatsapp', customerName: msg.name, messages: [], draft: {} },
        null,
        msg.chatId
      ));
    const draft = (conversation.draft ?? {}) as Draft;
    const phone = msg.phone ?? draft.phone ?? null;
    const previous = (conversation.messages as StoredMessage[]).filter((m) => m.role !== 'error');

    const settings = await getSettings();
    const tz = settings.timezone ?? env.BUSINESS_TIMEZONE;
    const now = localNow(tz);
    const [services, schedule, appointments] = (await Promise.all([
      listServices(true),
      getSchedule(),
      listAppointments(tz, { from: addDays(now.date, -1), to: addDays(now.date, 60) }),
    ])) as [Service[], DaySchedule[], Appt[]];

    const busy = appointments.filter((a) => a.status === 'confirmed');
    const slotsFor = (durationMinutes: number, from = now.date, maxPerDay = settings.maxSlotsShown ?? 6) =>
      freeSlotsByDay({
        schedule,
        busy,
        durationMinutes,
        interval: settings.slotInterval ?? 30,
        from,
        nowDate: now.date,
        nowTime: now.time,
        days: SLOT_DAYS,
        maxPerDay,
      });
    const ownIds = new Set(draft.appointmentIds ?? []);
    // Suyas: reservadas en este chat, o con su teléfono, o con su chat de WhatsApp si no hay número.
    const isMine = (a: Appt) =>
      ownIds.has(a.id) || (phone !== null && a.customerContact === phone) || a.customerContact === msg.chatId.toLowerCase();
    const mine = appointments.filter((a) => isMine(a) && a.date >= now.date);

    const welcome = previous.length === 0 ? welcomeText(settings, tenant.name) : undefined;
    const historyTurns = settings.historyTurns ?? 10;
    const history: ChatMessage[] = previous
      .slice(-historyTurns * 2)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const system = buildSystemPrompt({
      settings,
      businessType: tenant.businessType,
      tz,
      services,
      schedule,
      freeSlots: services.map((x) => ({ serviceId: x.id, days: slotsFor(x.durationMinutes) })),
      customerAppointments: mine,
      customerName: msg.name ?? conversation.customerName ?? undefined,
      welcomeSent: welcome,
    });
    const userMessages = (msg.parts?.length ? msg.parts : [msg.text]).map((t) => message('user', t));
    const save = (replies: string[], extraDraft: Partial<Draft> = {}) =>
      updateConversation(
        conversation.id,
        {
          customerName: msg.name ?? conversation.customerName ?? undefined,
          draft: { ...draft, ...(phone ? { phone } : {}), ...extraDraft },
          messages: [...(conversation.messages as StoredMessage[]), ...userMessages, ...replies.map((r) => message('assistant', r))].slice(
            -MAX_STORED_MESSAGES
          ),
        },
        null
      );

    // Primer contacto y solo un saludo: la bienvenida ya lo dice todo (y no se gasta IA).
    if (welcome && isGreetingOnly(msg.text)) {
      await save([welcome]);
      notifyChange(slug, 'conversations');
      return [welcome];
    }

    const timeoutMs = settings.timeoutSeconds ? settings.timeoutSeconds * 1000 : undefined;
    const answer = parseAssistantJson(
      await complete([{ role: 'system', content: system }, ...history, { role: 'user', content: msg.text }], timeoutMs)
    );

    const parts: string[] = [];
    let replaced = false;

    if (answer.cancel) {
      const target = mine.find((a) => a.id === answer.cancel!.appointmentId && a.status === 'confirmed');
      if (!target) {
        parts.push('No encuentro esa cita a tu nombre. ¿Me dices el día y la hora para revisarla?');
        replaced = true;
      } else {
        try {
          await updateAppointmentDetails(target.id, { status: 'cancelled', cancelReason: answer.cancel.reason }, null);
          parts.push(`❌ Tu cita de ${target.serviceName} del ${whenText(target.date, target.time)} ha sido cancelada.\nMotivo: ${answer.cancel.reason}`);
          replaced = !answer.book;
          if (!answer.book) parts.push('Si quieres reservar otra cita, aquí estoy 😊');
        } catch (err) {
          if (!(err instanceof HttpError)) throw err;
          parts.push(`No he podido cancelar la cita: ${err.message}.`);
          replaced = true;
        }
      }
    }

    if (answer.book) {
      try {
        const appt = await bookAppointment(
          {
            customerName: answer.book.fullName,
            customerContact: phone ? `+${phone}` : msg.chatId,
            serviceId: answer.book.serviceId,
            date: answer.book.date,
            time: answer.book.time,
            channel: 'whatsapp',
          },
          null
        );
        ownIds.add(appt.id);
        parts.push(
          `✅ Cita confirmada\n${appt.serviceName} · $${appt.price}\n${whenText(appt.date, appt.time)}\nA nombre de ${appt.customerName}` +
            `${settings.address ? `\n📍 ${settings.address}` : ''}\n¡Te esperamos! Si necesitas cancelar o cambiarla, escríbeme por aquí.`
        );
      } catch (err) {
        if (!(err instanceof HttpError)) throw err;
        const service = services.find((x) => x.id === answer.book!.serviceId);
        const alternatives = service ? alternativesText(slotsFor(service.durationMinutes, answer.book.date, 3)) : '';
        parts.push(`Uy, no he podido reservar esa hora (${err.message.toLowerCase()}). ${alternatives}`.trim());
      }
      replaced = true;
    }

    const replies = [...(welcome ? [welcome] : []), ...(replaced ? parts : [answer.reply, ...parts])];
    await save(replies, { appointmentIds: [...ownIds].slice(-20) });
    // Llega al panel al instante: conversación nueva y, si hubo reserva o cancelación, la cita.
    notifyChange(slug, 'conversations', ...(answer.book || answer.cancel ? (['appointments', 'customers'] as const) : []));
    return replies;
  });
}
