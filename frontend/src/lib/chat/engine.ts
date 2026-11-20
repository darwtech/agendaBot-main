/**
 * HopperSoft — Creador: Darwin Chavez
 */
import type {
  AIIntentType,
  AIProviderConfig,
  AIProviderId,
  Appointment,
  BookingDraft,
  BusinessSettings,
  ChannelType,
  ChatMessageItem,
  Customer,
  DaySchedule,
  ParsedAIIntent,
  ServiceItem,
} from '../../store/types';
import { createEmptyDraft } from '../../store/seed';
import { getAIProvider } from '../ai/registry';
import { parseAndSanitizeAIIntent } from '../ai/schema';
import { AIProviderError, type AIChatMessage } from '../ai/types';
import {
  bookAppointmentPure,
  findNextAvailableDates,
  getAvailableSlots,
  type BookAppointmentResult,
} from '../booking/slots';
import {
  DAY_NAMES_ES,
  formatCurrency,
  formatDateEs,
  getNowPartsInTimezone,
} from '../booking/timezone';

export interface EngineEnvironment {
  settings: BusinessSettings;
  activeProviderId: AIProviderId;
  providers: Record<AIProviderId, AIProviderConfig>;
  services: ServiceItem[];
  schedule: DaySchedule[];
  appointments: Appointment[];
  customers: Customer[];
  onBookAppointment?: (input: {
    serviceId: string;
    date: string;
    time: string;
    fullName: string;
    contact: string;
    channel: ChannelType;
  }) => BookAppointmentResult;
}

export interface ProcessTurnInput {
  userMessage: string;
  history: ChatMessageItem[];
  draft: BookingDraft;
  channel?: ChannelType;
  providerIdOverride?: AIProviderId;
  dryRun?: boolean;
  signal?: AbortSignal;
  now?: Date;
}

export interface ProcessTurnResult {
  reply: string;
  isError: boolean;
  errorCode?: string;
  intent: AIIntentType;
  parsedIntent: ParsedAIIntent | null;
  rawJson: string | null;
  latencyMs: number;
  updatedDraft: BookingDraft;
  suggestedSlots?: string[];
  isConfirmationPrompt?: boolean;
  bookedAppointment?: Appointment;
  resolvedWithoutAI: boolean;
}

function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Note: Avoid \b after accented characters like "í" in JS RegExp!
const AFFIRMATIVE_REGEX =
  /(?:^|[\s.,¡!¿?])(sí|si|claro|vale|ok|perfecto|confirmo|confirmar|de acuerdo|adelante|por supuesto)(?=$|[\s.,¡!¿?])/i;
const NEGATIVE_REGEX =
  /(?:^|[\s.,¡!¿?])(no|cancelar|cancela|anular|mejor no|cambiar|espera)(?=$|[\s.,¡!¿?])/i;

export function detectConfirmationAnswer(
  text: string
): 'yes' | 'no' | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (NEGATIVE_REGEX.test(trimmed) && !AFFIRMATIVE_REGEX.test(trimmed)) {
    return 'no';
  }
  if (AFFIRMATIVE_REGEX.test(trimmed) && !NEGATIVE_REGEX.test(trimmed)) {
    return 'yes';
  }
  // Exact single-word check
  const low = trimmed.toLowerCase();
  if (low === 'sí' || low === 'si') return 'yes';
  if (low === 'no') return 'no';
  return null;
}

export function buildSystemPrompt(
  template: string,
  settings: BusinessSettings,
  services: ServiceItem[],
  now?: Date
): string {
  const { dateStr } = getNowPartsInTimezone(settings.timezone, now);
  const activeServices = services.filter((s) => s.active);
  const servicesSummary =
    activeServices.length > 0
      ? activeServices
          .map(
            (s) =>
              `- ${s.name} (${s.durationMinutes} min, ${formatCurrency(
                s.price,
                settings.currency
              )})`
          )
          .join('\n')
      : '- Sin servicios activos actualmente';

  return template
    .replace(/\{\{negocio\}\}/g, settings.businessName)
    .replace(/\{\{hoy\}\}/g, dateStr)
    .replace(/\{\{servicios\}\}/g, servicesSummary);
}

export function matchServiceFromText(
  candidate: string | null,
  services: ServiceItem[]
): ServiceItem | null {
  if (!candidate) return null;
  const active = services.filter((s) => s.active);
  if (active.length === 0) return null;

  const norm = normalizeStr(candidate);
  // Exact match first
  const exact = active.find((s) => normalizeStr(s.name) === norm);
  if (exact) return exact;

  // Contains match (prefer longer service name first so "Corte + barba" beats "Corte clásico")
  const sortedByLength = [...active].sort(
    (a, b) => b.name.length - a.name.length
  );
  const contains = sortedByLength.find(
    (s) => normalizeStr(s.name).includes(norm) || norm.includes(normalizeStr(s.name))
  );
  if (contains) return contains;

  // Token overlap match
  const tokens = norm.split(/\s+/).filter((t) => t.length >= 3);
  if (tokens.length > 0) {
    let best: ServiceItem | null = null;
    let bestScore = 0;
    for (const s of active) {
      const sNorm = normalizeStr(s.name);
      const score = tokens.filter((t) => sNorm.includes(t)).length;
      if (score > bestScore) {
        bestScore = score;
        best = s;
      }
    }
    if (best && bestScore > 0) return best;
  }

  return null;
}

function formatScheduleOverview(schedule: DaySchedule[]): string {
  const orderedDays: Array<DaySchedule['dayOfWeek']> = [1, 2, 3, 4, 5, 6, 0];
  return orderedDays
    .map((dow) => {
      const day = schedule.find((d) => d.dayOfWeek === dow);
      const name = DAY_NAMES_ES[dow];
      if (!day || day.closed || day.blocks.length === 0) {
        return `• ${name}: Cerrado`;
      }
      const ranges = day.blocks.map((b) => `${b.start}–${b.end}`).join(' y ');
      return `• ${name}: ${ranges}`;
    })
    .join('\n');
}

function formatServicesOverview(
  services: ServiceItem[],
  currency: string
): string {
  const active = services.filter((s) => s.active);
  if (active.length === 0) {
    return 'En este momento no hay servicios disponibles.';
  }
  return active
    .map(
      (s) =>
        `• ${s.name}: ${s.durationMinutes} min · ${formatCurrency(
          s.price,
          currency
        )}`
    )
    .join('\n');
}

function buildConfirmationSummary(
  draft: BookingDraft,
  service: ServiceItem,
  currency: string
): string {
  return (
    `Resumen de tu reserva:\n` +
    `• Servicio: ${service.name} (${service.durationMinutes} min · ${formatCurrency(
      service.price,
      currency
    )})\n` +
    `• Fecha: ${formatDateEs(draft.date!)} (${draft.date})\n` +
    `• Hora: ${draft.time}\n` +
    `• Nombre: ${draft.fullName}\n` +
    `• Contacto: ${draft.contact}\n\n` +
    `¿Confirmas la reserva? Responde sí o no.`
  );
}

export async function processChatTurn(
  input: ProcessTurnInput,
  env: EngineEnvironment
): Promise<ProcessTurnResult> {
  const channel = input.channel ?? 'web';
  const maxSlots = Math.max(1, env.settings.maxSlotsShown || 6);
  const bookingCtx = {
    services: env.services,
    schedule: env.schedule,
    appointments: env.appointments,
    timezone: env.settings.timezone,
    slotInterval: env.settings.slotInterval,
    now: input.now,
  };

  // 1. Resolve pending "sí / no" confirmation WITHOUT calling AI
  if (input.draft.awaitingConfirmation) {
    const answer = detectConfirmationAnswer(input.userMessage);
    if (answer === 'yes') {
      const service = env.services.find(
        (s) => s.id === input.draft.serviceId && s.active
      );
      if (
        !service ||
        !input.draft.date ||
        !input.draft.time ||
        !input.draft.fullName ||
        !input.draft.contact
      ) {
        return {
          reply:
            'Faltan algunos datos para completar la reserva. Empecemos de nuevo: ¿qué servicio te gustaría reservar?',
          isError: false,
          intent: 'CONFIRM',
          parsedIntent: null,
          rawJson: null,
          latencyMs: 0,
          updatedDraft: createEmptyDraft(),
          resolvedWithoutAI: true,
        };
      }

      const bookingPayload = {
        serviceId: service.id,
        date: input.draft.date,
        time: input.draft.time,
        fullName: input.draft.fullName,
        contact: input.draft.contact,
        channel,
      };

      let result: BookAppointmentResult;
      if (input.dryRun) {
        result = bookAppointmentPure(bookingPayload, {
          ...bookingCtx,
          customers: env.customers,
        });
      } else if (env.onBookAppointment) {
        result = env.onBookAppointment(bookingPayload);
      } else {
        result = bookAppointmentPure(bookingPayload, {
          ...bookingCtx,
          customers: env.customers,
        });
      }

      if (result.ok) {
        return {
          reply:
            `✅ Cita confirmada\n` +
            `• Servicio: ${result.appointment.serviceName} (${formatCurrency(
              result.appointment.price,
              env.settings.currency
            )})\n` +
            `• Fecha: ${formatDateEs(result.appointment.date)} (${result.appointment.date})\n` +
            `• Hora: ${result.appointment.time}\n` +
            `• A nombre de: ${result.appointment.customerName}\n\n` +
            `¡Te esperamos en ${env.settings.businessName}!`,
          isError: false,
          intent: 'CONFIRM',
          parsedIntent: null,
          rawJson: null,
          latencyMs: 0,
          updatedDraft: createEmptyDraft(),
          bookedAppointment: result.appointment,
          resolvedWithoutAI: true,
        };
      }

      // Slot got occupied right before saving -> offer alternatives
      const alternatives = result.alternatives.slice(0, maxSlots);
      return {
        reply:
          alternatives.length > 0
            ? `Lo siento, la franja de las ${input.draft.time} acaba de ocuparse. Estos son los huecos libres para ${formatDateEs(
                input.draft.date
              )}: ${alternatives.join(', ')}. ¿Cuál prefieres?`
            : `Lo siento, ya no quedan huecos disponibles el ${formatDateEs(
                input.draft.date
              )}. ¿Te gustaría probar otro día?`,
        isError: false,
        intent: 'BOOK_APPOINTMENT',
        parsedIntent: null,
        rawJson: null,
        latencyMs: 0,
        updatedDraft: {
          ...input.draft,
          time: null,
          awaitingConfirmation: false,
        },
        suggestedSlots: alternatives.length > 0 ? alternatives : undefined,
        resolvedWithoutAI: true,
      };
    }

    if (answer === 'no') {
      return {
        reply:
          'De acuerdo, no he guardado la cita. Si quieres cambiar algún dato (servicio, día u hora) o empezar otra reserva, dímelo.',
        isError: false,
        intent: 'CANCEL',
        parsedIntent: null,
        rawJson: null,
        latencyMs: 0,
        updatedDraft: createEmptyDraft(),
        resolvedWithoutAI: true,
      };
    }
  }

  // 2. Call the configured AI provider (ONLY interprets intent & entities)
  const providerId = input.providerIdOverride ?? env.activeProviderId;
  const provider = getAIProvider(providerId);
  const providerConfig = env.providers[providerId];
  const systemPrompt = buildSystemPrompt(
    env.settings.systemPrompt,
    env.settings,
    env.services,
    input.now
  );

  const historyLimit = Math.max(1, env.settings.historyTurns || 6);
  const recentMessages: AIChatMessage[] = input.history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-historyLimit)
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  recentMessages.push({ role: 'user', content: input.userMessage });

  const startTime = performance.now();
  let rawJson: string;
  try {
    rawJson = await provider.complete({
      system: systemPrompt,
      messages: recentMessages,
      signal: input.signal,
      config: providerConfig,
      timeoutSeconds: env.settings.timeoutSeconds || 15,
    });
  } catch (err) {
    const latencyMs = Math.round(performance.now() - startTime);
    const aiErr =
      err instanceof AIProviderError
        ? err
        : new AIProviderError('UNAVAILABLE', providerId);
    return {
      reply: aiErr.message,
      isError: true,
      errorCode: aiErr.code,
      intent: 'OTHER',
      parsedIntent: null,
      rawJson: null,
      latencyMs,
      updatedDraft: input.draft,
      resolvedWithoutAI: false,
    };
  }

  const latencyMs = Math.round(performance.now() - startTime);
  const sanitized = parseAndSanitizeAIIntent(rawJson);
  const parsed = sanitized.data;

  // 3. Handle CANCEL intent
  if (parsed.intent === 'CANCEL') {
    const hadDraft = Boolean(
      input.draft.serviceId || input.draft.date || input.draft.time
    );
    return {
      reply: hadDraft
        ? 'He cancelado la reserva en curso. Si deseas consultar horarios o empezar de nuevo, dime cuándo te viene bien.'
        : 'Para cancelar una cita ya confirmada, indícanos tu nombre y te ayudaremos desde recepción, o escribe qué nuevo horario quieres consultar.',
      isError: false,
      intent: 'CANCEL',
      parsedIntent: parsed,
      rawJson,
      latencyMs,
      updatedDraft: createEmptyDraft(),
      resolvedWithoutAI: false,
    };
  }

  // 4. Handle FAQ intent (only if not actively filling a booking step unless asking general question)
  const isMidBooking = Boolean(
    input.draft.serviceId || input.draft.date || input.draft.time
  );
  if (parsed.intent === 'FAQ' && !parsed.date && !parsed.time) {
    const servicesText = formatServicesOverview(
      env.services,
      env.settings.currency
    );
    const scheduleText = formatScheduleOverview(env.schedule);
    return {
      reply:
        `Estos son los servicios de ${env.settings.businessName}:\n${servicesText}\n\n` +
        `Nuestro horario habitual:\n${scheduleText}\n\n` +
        `¿Te gustaría reservar alguno?`,
      isError: false,
      intent: 'FAQ',
      parsedIntent: parsed,
      rawJson,
      latencyMs,
      updatedDraft: input.draft,
      resolvedWithoutAI: false,
    };
  }

  // 5. Merge extracted fields into booking draft
  const matchedService = matchServiceFromText(parsed.service, env.services);
  const nextDraft: BookingDraft = {
    ...input.draft,
    serviceId: matchedService ? matchedService.id : input.draft.serviceId,
    serviceName: matchedService ? matchedService.name : input.draft.serviceName,
    date: parsed.date ?? input.draft.date,
    time: parsed.time ?? input.draft.time,
    fullName: parsed.fullName ?? input.draft.fullName,
    contact: parsed.contact ?? input.draft.contact,
    awaitingConfirmation: false,
  };

  // 6. Handle CHECK_AVAILABILITY intent
  if (parsed.intent === 'CHECK_AVAILABILITY' && !nextDraft.time) {
    const activeServices = env.services.filter((s) => s.active);
    const refService =
      (nextDraft.serviceId
        ? activeServices.find((s) => s.id === nextDraft.serviceId)
        : activeServices[0]) ?? null;

    if (!refService) {
      return {
        reply: 'Ahora mismo no tenemos servicios activos configurados.',
        isError: false,
        intent: 'CHECK_AVAILABILITY',
        parsedIntent: parsed,
        rawJson,
        latencyMs,
        updatedDraft: nextDraft,
        resolvedWithoutAI: false,
      };
    }

    const { dateStr: todayStr } = getNowPartsInTimezone(
      env.settings.timezone,
      input.now
    );
    const targetDate = nextDraft.date ?? todayStr;
    const slots = getAvailableSlots(targetDate, refService.id, bookingCtx);

    if (slots.length === 0) {
      const nextDays = findNextAvailableDates(
        targetDate,
        refService.id,
        bookingCtx,
        14,
        3
      );
      const nextHint =
        nextDays.length > 0
          ? ` Los próximos días con hueco son:\n${nextDays
              .map(
                (d) =>
                  `• ${formatDateEs(d.date)}: ${d.slots
                    .slice(0, maxSlots)
                    .join(', ')}`
              )
              .join('\n')}`
          : '';
      return {
        reply: `No quedan huecos libres el ${formatDateEs(
          targetDate
        )} para ${refService.name}.${nextHint}`,
        isError: false,
        intent: 'CHECK_AVAILABILITY',
        parsedIntent: parsed,
        rawJson,
        latencyMs,
        updatedDraft: nextDraft,
        resolvedWithoutAI: false,
      };
    }

    const shown = slots.slice(0, maxSlots);
    return {
      reply:
        `Para ${refService.name} (${refService.durationMinutes} min) el ${formatDateEs(
          targetDate
        )} tenemos estos huecos disponibles: ${shown.join(', ')}.\n\n` +
        (nextDraft.serviceId
          ? '¿A qué hora te gustaría reservar?'
          : 'Dime qué servicio y qué hora prefieres para reservar.'),
      isError: false,
      intent: 'CHECK_AVAILABILITY',
      parsedIntent: parsed,
      rawJson,
      latencyMs,
      updatedDraft: nextDraft,
      suggestedSlots: shown,
      resolvedWithoutAI: false,
    };
  }

  // 7. Handle OTHER when not in booking flow and no booking fields extracted
  const hasAnyBookingData = Boolean(
    nextDraft.serviceId ||
      nextDraft.date ||
      nextDraft.time ||
      nextDraft.fullName ||
      nextDraft.contact
  );

  if (
    parsed.intent === 'OTHER' &&
    !isMidBooking &&
    !hasAnyBookingData
  ) {
    return {
      reply:
        `Estoy aquí para ayudarte con tus citas en ${env.settings.businessName}. Puedes preguntarme por los servicios y precios, consultar si hay hueco un día concreto o decirme qué servicio quieres reservar.`,
      isError: false,
      intent: 'OTHER',
      parsedIntent: parsed,
      rawJson,
      latencyMs,
      updatedDraft: nextDraft,
      resolvedWithoutAI: false,
    };
  }

  // 8. Booking step-by-step flow: servicio -> fecha -> hora -> nombre -> contacto -> resumen
  const activeServices = env.services.filter((s) => s.active);
  if (activeServices.length === 0) {
    return {
      reply: 'Lo siento, ahora mismo no hay servicios disponibles para reservar.',
      isError: false,
      intent: parsed.intent,
      parsedIntent: parsed,
      rawJson,
      latencyMs,
      updatedDraft: createEmptyDraft(),
      resolvedWithoutAI: false,
    };
  }

  // Step 1: Service
  if (!nextDraft.serviceId) {
    return {
      reply:
        `¿Qué servicio te gustaría reservar?\n` +
        formatServicesOverview(env.services, env.settings.currency),
      isError: false,
      intent: parsed.intent,
      parsedIntent: parsed,
      rawJson,
      latencyMs,
      updatedDraft: nextDraft,
      resolvedWithoutAI: false,
    };
  }

  const selectedService = activeServices.find(
    (s) => s.id === nextDraft.serviceId
  );
  if (!selectedService) {
    return {
      reply:
        `Ese servicio ya no está disponible. Elige uno de nuestros servicios activos:\n` +
        formatServicesOverview(env.services, env.settings.currency),
      isError: false,
      intent: parsed.intent,
      parsedIntent: parsed,
      rawJson,
      latencyMs,
      updatedDraft: { ...nextDraft, serviceId: null, serviceName: null },
      resolvedWithoutAI: false,
    };
  }

  // Step 2: Date
  if (!nextDraft.date) {
    return {
      reply: `Perfecto, ${selectedService.name} (${selectedService.durationMinutes} min · ${formatCurrency(
        selectedService.price,
        env.settings.currency
      )}). ¿Para qué día te gustaría la cita? (Por ejemplo: hoy, mañana o una fecha concreta).`,
      isError: false,
      intent: parsed.intent,
      parsedIntent: parsed,
      rawJson,
      latencyMs,
      updatedDraft: nextDraft,
      resolvedWithoutAI: false,
    };
  }

  // Step 3: Time (validate against real available slots!)
  const realSlots = getAvailableSlots(
    nextDraft.date,
    selectedService.id,
    bookingCtx
  );

  if (realSlots.length === 0) {
    const nextDays = findNextAvailableDates(
      nextDraft.date,
      selectedService.id,
      bookingCtx,
      14,
      3
    );
    const nextHint =
      nextDays.length > 0
        ? `\n\nPróximos días disponibles:\n${nextDays
            .map(
              (d) =>
                `• ${formatDateEs(d.date)} (${d.date}): ${d.slots
                  .slice(0, maxSlots)
                  .join(', ')}`
            )
            .join('\n')}`
        : '';

    return {
      reply: `Lo siento, no hay huecos libres el ${formatDateEs(
        nextDraft.date
      )} para ${selectedService.name}.${nextHint}\n\n¿Qué otro día prefieres?`,
      isError: false,
      intent: parsed.intent,
      parsedIntent: parsed,
      rawJson,
      latencyMs,
      updatedDraft: { ...nextDraft, date: null, time: null },
      resolvedWithoutAI: false,
    };
  }

  const shownSlots = realSlots.slice(0, maxSlots);

  if (!nextDraft.time) {
    return {
      reply: `Para ${selectedService.name} el ${formatDateEs(
        nextDraft.date
      )} tenemos disponibles estas horas: ${shownSlots.join(
        ', '
      )}.\n\n¿Cuál prefieres?`,
      isError: false,
      intent: parsed.intent,
      parsedIntent: parsed,
      rawJson,
      latencyMs,
      updatedDraft: nextDraft,
      suggestedSlots: shownSlots,
      resolvedWithoutAI: false,
    };
  }

  // Check if requested time is actually free
  if (!realSlots.includes(nextDraft.time)) {
    const requestedTime = nextDraft.time;
    return {
      reply: `La hora ${requestedTime} ya está ocupada o fuera de horario el ${formatDateEs(
        nextDraft.date
      )}. Estas son las horas libres disponibles: ${shownSlots.join(
        ', '
      )}.\n\n¿Te encaja alguna de estas alternativas?`,
      isError: false,
      intent: parsed.intent,
      parsedIntent: parsed,
      rawJson,
      latencyMs,
      updatedDraft: { ...nextDraft, time: null },
      suggestedSlots: shownSlots,
      resolvedWithoutAI: false,
    };
  }

  // Step 4: Full Name
  if (!nextDraft.fullName) {
    return {
      reply: `Genial, reservamos ${selectedService.name} el ${formatDateEs(
        nextDraft.date
      )} a las ${nextDraft.time}. ¿Cuál es tu nombre completo?`,
      isError: false,
      intent: parsed.intent,
      parsedIntent: parsed,
      rawJson,
      latencyMs,
      updatedDraft: nextDraft,
      resolvedWithoutAI: false,
    };
  }

  // Step 5: Contact
  if (!nextDraft.contact) {
    return {
      reply: `Gracias, ${nextDraft.fullName}. Por último, ¿nos dejas un teléfono o correo electrónico de contacto?`,
      isError: false,
      intent: parsed.intent,
      parsedIntent: parsed,
      rawJson,
      latencyMs,
      updatedDraft: nextDraft,
      resolvedWithoutAI: false,
    };
  }

  // Step 6: All data ready -> Summary + ask sí/no
  const confirmedDraft: BookingDraft = {
    ...nextDraft,
    awaitingConfirmation: true,
  };

  return {
    reply: buildConfirmationSummary(
      confirmedDraft,
      selectedService,
      env.settings.currency
    ),
    isError: false,
    intent: parsed.intent,
    parsedIntent: parsed,
    rawJson,
    latencyMs,
    updatedDraft: confirmedDraft,
    isConfirmationPrompt: true,
    resolvedWithoutAI: false,
  };
}
