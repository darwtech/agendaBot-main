import {
  addDaysToDateStr,
  getNowPartsInTimezone,
  getWeekdayFromDateStr,
} from '../lib/booking/timezone';
import type {
  AIProviderConfig,
  AIProviderId,
  Appointment,
  BookingDraft,
  BusinessSettings,
  Conversation,
  Customer,
  DaySchedule,
  ServiceItem,
} from './types';

export const DEFAULT_SYSTEM_PROMPT = `Eres el intérprete de intenciones del asistente de citas de {{negocio}}.
Hoy es {{hoy}}.
Servicios disponibles:
{{servicios}}

Reglas estrictas:
1. Devuelve ÚNICAMENTE un objeto JSON válido sin texto adicional ni bloques markdown.
2. Nunca inventes disponibilidad ni confirmes citas; tu función es únicamente interpretar la intención del usuario y extraer los datos que haya mencionado.
3. Esquema exacto:
{
  "intent": "FAQ" | "CHECK_AVAILABILITY" | "BOOK_APPOINTMENT" | "CONFIRM" | "CANCEL" | "OTHER",
  "date": "YYYY-MM-DD" | null,
  "time": "HH:MM" | null,
  "service": string | null,
  "fullName": string | null,
  "contact": string | null
}`;

export function createDefaultSettings(): BusinessSettings {
  return {
    businessName: 'Barbería Clásica Serrano',
    businessType: 'barberia',
    timezone: 'America/Guayaquil',
    slotInterval: 30,
    currency: 'USD',
    adminPin: '1234',
    pinChangedFromDefault: false,
    theme: 'system',
    accentColor: 'emerald',
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    timeoutSeconds: 15,
    historyTurns: 6,
    maxSlotsShown: 6,
    whatsappStatus: 'disconnected',
  };
}

export function createDefaultProviders(): Record<AIProviderId, AIProviderConfig> {
  return {
    mock: {
      id: 'mock',
      enabled: true,
      apiKey: '',
      model: 'demo-local',
    },
    anthropic: {
      id: 'anthropic',
      enabled: false,
      apiKey: '',
      model: 'claude-opus-5-5',
    },
    groq: {
      id: 'groq',
      enabled: false,
      apiKey: '',
      model: 'openai/gpt-oss-120b',
    },
    gemini: {
      id: 'gemini',
      enabled: false,
      apiKey: '',
      model: 'gemini-2.5-flash',
    },
    deepseek: {
      id: 'deepseek',
      enabled: false,
      apiKey: '',
      model: 'deepseek-flash',
    },
    openaiCompatible: {
      id: 'openaiCompatible',
      enabled: false,
      apiKey: '',
      model: 'gpt-4o-mini',
      baseUrl: 'https://api.openai.com/v1',
    },
  };
}

export function createDefaultServices(): ServiceItem[] {
  return [
    {
      id: 'srv-corte-clasico',
      name: 'Corte clásico',
      description: 'Corte a tijera y máquina adaptado a tu estilo, lavado y acabado.',
      durationMinutes: 30,
      price: 15,
      active: true,
    },
    {
      id: 'srv-arreglo-barba',
      name: 'Arreglo de barba',
      description: 'Perfilado con navaja, toalla caliente y aceite hidratante.',
      durationMinutes: 30,
      price: 10,
      active: true,
    },
    {
      id: 'srv-corte-barba',
      name: 'Corte + barba',
      description: 'Ritual completo de corte clásico y arreglo de barba con toalla caliente.',
      durationMinutes: 60,
      price: 22,
      active: true,
    },
    {
      id: 'srv-corte-infantil',
      name: 'Corte infantil',
      description: 'Para menores de 12 años con acabado suave y rápido.',
      durationMinutes: 30,
      price: 12,
      active: true,
    },
  ];
}

export function createDefaultSchedule(): DaySchedule[] {
  return [
    {
      dayOfWeek: 1,
      closed: false,
      blocks: [
        { start: '10:00', end: '14:00' },
        { start: '16:00', end: '20:00' },
      ],
    },
    {
      dayOfWeek: 2,
      closed: false,
      blocks: [
        { start: '10:00', end: '14:00' },
        { start: '16:00', end: '20:00' },
      ],
    },
    {
      dayOfWeek: 3,
      closed: false,
      blocks: [
        { start: '10:00', end: '14:00' },
        { start: '16:00', end: '20:00' },
      ],
    },
    {
      dayOfWeek: 4,
      closed: false,
      blocks: [
        { start: '10:00', end: '14:00' },
        { start: '16:00', end: '20:00' },
      ],
    },
    {
      dayOfWeek: 5,
      closed: false,
      blocks: [
        { start: '10:00', end: '14:00' },
        { start: '16:00', end: '20:00' },
      ],
    },
    {
      dayOfWeek: 6,
      closed: false,
      blocks: [{ start: '10:00', end: '14:00' }],
    },
    {
      dayOfWeek: 0,
      closed: true,
      blocks: [],
    },
  ];
}

export function createEmptyDraft(): BookingDraft {
  return {
    serviceId: null,
    serviceName: null,
    date: null,
    time: null,
    fullName: null,
    contact: null,
    awaitingConfirmation: false,
  };
}

function findNextOpenDates(todayStr: string, schedule: DaySchedule[], count: number): string[] {
  const result: string[] = [];
  for (let offset = 0; offset <= 14 && result.length < count; offset++) {
    const candidate = addDaysToDateStr(todayStr, offset);
    const dow = getWeekdayFromDateStr(candidate);
    const dayCfg = schedule.find((d) => d.dayOfWeek === dow);
    if (dayCfg && !dayCfg.closed && dayCfg.blocks.length > 0) {
      result.push(candidate);
    }
  }
  return result;
}

export function createDemoSeedData(timeZone: string = 'Europe/Madrid'): {
  services: ServiceItem[];
  schedule: DaySchedule[];
  customers: Customer[];
  appointments: Appointment[];
  conversations: Conversation[];
} {
  const services = createDefaultServices();
  const schedule = createDefaultSchedule();
  const { dateStr: todayStr } = getNowPartsInTimezone(timeZone);
  const nowIso = new Date().toISOString();

  const customers: Customer[] = [
    { id: 'cust-1', fullName: 'Carlos Mendoza', contact: '+34 612 345 678', createdAt: nowIso },
    { id: 'cust-2', fullName: 'Javier Ruiz', contact: '+34 634 891 203', createdAt: nowIso },
    { id: 'cust-3', fullName: 'Mateo Navarro', contact: 'mateo.navarro@correo.es', createdAt: nowIso },
    { id: 'cust-4', fullName: 'Alejandro Torres', contact: '+34 655 112 940', createdAt: nowIso },
    { id: 'cust-5', fullName: 'Diego Morales', contact: '+34 678 440 219', createdAt: nowIso },
    { id: 'cust-6', fullName: 'Lucas Serrano', contact: 'lucas.serrano@correo.es', createdAt: nowIso },
  ];

  const openDates = findNextOpenDates(todayStr, schedule, 6);
  const d0 = openDates[0] ?? todayStr;
  const d1 = openDates[1] ?? addDaysToDateStr(todayStr, 1);
  const d2 = openDates[2] ?? addDaysToDateStr(todayStr, 2);
  const d3 = openDates[3] ?? addDaysToDateStr(todayStr, 3);
  const d4 = openDates[4] ?? addDaysToDateStr(todayStr, 4);
  const d5 = openDates[5] ?? addDaysToDateStr(todayStr, 5);

  const s0 = services[0]; // Corte clásico 30m $15
  const s1 = services[1]; // Arreglo de barba 30m $10
  const s2 = services[2]; // Corte + barba 60m $22
  const s3 = services[3]; // Corte infantil 30m $12

  const appointments: Appointment[] = [
    {
      id: 'apt-demo-1',
      customerId: customers[0].id,
      customerName: customers[0].fullName,
      customerContact: customers[0].contact,
      serviceId: s0.id,
      serviceName: s0.name,
      price: s0.price,
      durationMinutes: s0.durationMinutes,
      date: d0,
      time: '18:00',
      status: 'confirmed',
      channel: 'web',
      createdAt: nowIso,
    },
    {
      id: 'apt-demo-2',
      customerId: customers[1].id,
      customerName: customers[1].fullName,
      customerContact: customers[1].contact,
      serviceId: s2.id,
      serviceName: s2.name,
      price: s2.price,
      durationMinutes: s2.durationMinutes,
      date: d1,
      time: '10:30',
      status: 'confirmed',
      channel: 'whatsapp',
      createdAt: nowIso,
    },
    {
      id: 'apt-demo-3',
      customerId: customers[2].id,
      customerName: customers[2].fullName,
      customerContact: customers[2].contact,
      serviceId: s1.id,
      serviceName: s1.name,
      price: s1.price,
      durationMinutes: s1.durationMinutes,
      date: d1,
      time: '17:00',
      status: 'confirmed',
      channel: 'web',
      createdAt: nowIso,
    },
    {
      id: 'apt-demo-4',
      customerId: customers[3].id,
      customerName: customers[3].fullName,
      customerContact: customers[3].contact,
      serviceId: s0.id,
      serviceName: s0.name,
      price: s0.price,
      durationMinutes: s0.durationMinutes,
      date: d2,
      time: '11:30',
      status: 'cancelled',
      channel: 'web',
      createdAt: nowIso,
      cancelledAt: nowIso,
    },
    {
      id: 'apt-demo-5',
      customerId: customers[4].id,
      customerName: customers[4].fullName,
      customerContact: customers[4].contact,
      serviceId: s2.id,
      serviceName: s2.name,
      price: s2.price,
      durationMinutes: s2.durationMinutes,
      date: d2,
      time: '18:00',
      status: 'confirmed',
      channel: 'whatsapp',
      createdAt: nowIso,
    },
    {
      id: 'apt-demo-6',
      customerId: customers[5].id,
      customerName: customers[5].fullName,
      customerContact: customers[5].contact,
      serviceId: s3.id,
      serviceName: s3.name,
      price: s3.price,
      durationMinutes: s3.durationMinutes,
      date: d3,
      time: '12:00',
      status: 'confirmed',
      channel: 'web',
      createdAt: nowIso,
    },
    {
      id: 'apt-demo-7',
      customerId: customers[0].id,
      customerName: customers[0].fullName,
      customerContact: customers[0].contact,
      serviceId: s1.id,
      serviceName: s1.name,
      price: s1.price,
      durationMinutes: s1.durationMinutes,
      date: d4,
      time: '16:30',
      status: 'cancelled',
      channel: 'whatsapp',
      createdAt: nowIso,
      cancelledAt: nowIso,
    },
    {
      id: 'apt-demo-8',
      customerId: customers[1].id,
      customerName: customers[1].fullName,
      customerContact: customers[1].contact,
      serviceId: s2.id,
      serviceName: s2.name,
      price: s2.price,
      durationMinutes: s2.durationMinutes,
      date: d5,
      time: '11:00',
      status: 'confirmed',
      channel: 'web',
      createdAt: nowIso,
    },
  ];

  const conversations: Conversation[] = [
    {
      id: 'conv-welcome',
      channel: 'web',
      createdAt: nowIso,
      updatedAt: nowIso,
      draft: createEmptyDraft(),
      messages: [
        {
          id: 'msg-welcome-1',
          role: 'assistant',
          content:
            '¡Hola! Soy el asistente de Barbería Clásica Serrano. Puedo mostrarte nuestros servicios, consultar horarios disponibles o reservar tu cita paso a paso. ¿En qué te ayudo hoy?',
          timestamp: nowIso,
          intent: 'OTHER',
          providerLabel: 'Modo demo',
        },
      ],
    },
    {
      id: 'conv-demo-wa',
      channel: 'whatsapp',
      customerName: 'Javier Ruiz',
      createdAt: nowIso,
      updatedAt: nowIso,
      draft: createEmptyDraft(),
      messages: [
        {
          id: 'msg-wa-1',
          role: 'user',
          content: 'Hola, quería reservar corte + barba mañana a las 10:30',
          timestamp: nowIso,
        },
        {
          id: 'msg-wa-2',
          role: 'assistant',
          content:
            'Perfecto, tengo hueco disponible a las 10:30 para Corte + barba (60 min · $22). ¿Me indicas tu nombre completo y un teléfono o correo de contacto?',
          timestamp: nowIso,
          intent: 'BOOK_APPOINTMENT',
          parsedIntent: {
            intent: 'BOOK_APPOINTMENT',
            date: d1,
            time: '10:30',
            service: 'Corte + barba',
            fullName: null,
            contact: null,
          },
          providerLabel: 'Modo demo',
        },
        {
          id: 'msg-wa-3',
          role: 'user',
          content: 'Javier Ruiz, 634 891 203',
          timestamp: nowIso,
        },
        {
          id: 'msg-wa-4',
          role: 'assistant',
          content:
            'Resumen de tu cita:\n• Servicio: Corte + barba (60 min · $22)\n• Fecha: ' +
            d1 +
            '\n• Hora: 10:30\n• Nombre: Javier Ruiz\n• Contacto: +34 634 891 203\n\n¿Confirmas la reserva? Responde sí o no.',
          timestamp: nowIso,
          intent: 'BOOK_APPOINTMENT',
          providerLabel: 'Modo demo',
          isConfirmationPrompt: true,
        },
        {
          id: 'msg-wa-5',
          role: 'user',
          content: 'Sí, perfecto',
          timestamp: nowIso,
        },
        {
          id: 'msg-wa-6',
          role: 'assistant',
          content: '✅ Cita confirmada para Javier Ruiz el ' + d1 + ' a las 10:30 (Corte + barba).',
          timestamp: nowIso,
          intent: 'CONFIRM',
          providerLabel: 'Modo demo',
        },
      ],
    },
  ];

  return {
    services,
    schedule,
    customers,
    appointments,
    conversations,
  };
}
