export type AIProviderId =
  | 'mock'
  | 'anthropic'
  | 'groq'
  | 'gemini'
  | 'deepseek'
  | 'openaiCompatible';

export type AIIntentType =
  | 'FAQ'
  | 'CHECK_AVAILABILITY'
  | 'BOOK_APPOINTMENT'
  | 'CONFIRM'
  | 'CANCEL'
  | 'OTHER';

export interface ParsedAIIntent {
  intent: AIIntentType;
  date: string | null;
  time: string | null;
  service: string | null;
  fullName: string | null;
  contact: string | null;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentColor = 'emerald' | 'blue' | 'amber' | 'rose' | 'slate';
export type CurrencyCode = 'EUR' | 'USD' | 'MXN' | 'COP' | 'ARS';
export type SlotInterval = 15 | 30 | 60;
export type ChannelType = 'web' | 'whatsapp';
export type AppointmentStatus = 'confirmed' | 'cancelled';
export type WhatsAppStatus = 'disconnected' | 'qr' | 'connected';

export interface BusinessSettings {
  businessName: string;
  timezone: string;
  slotInterval: SlotInterval;
  currency: CurrencyCode;
  adminPin: string;
  pinChangedFromDefault: boolean;
  theme: ThemeMode;
  accentColor: AccentColor;
  systemPrompt: string;
  timeoutSeconds: number;
  historyTurns: number;
  maxSlotsShown: number;
  whatsappStatus: WhatsAppStatus;
  /** Tipo de negocio (barberia, spa, clinica…). Lo fija la plataforma; solo lectura en el frontend. */
  businessType?: string;
  /** Datos del establecimiento que usa el asistente de WhatsApp. */
  address?: string;
  phone?: string;
  businessInfo?: string;
  welcomeMessage?: string;
}

export interface AIProviderConfig {
  id: AIProviderId;
  enabled: boolean;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  active: boolean;
}

export interface TimeBlock {
  start: string; // HH:MM
  end: string; // HH:MM
}

export interface DaySchedule {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Domingo, 1 = Lunes ... 6 = Sábado
  closed: boolean;
  blocks: TimeBlock[];
}

export interface Appointment {
  id: string;
  customerId: string;
  customerName: string;
  customerContact: string;
  serviceId: string;
  serviceName: string;
  price: number;
  durationMinutes: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  status: AppointmentStatus;
  channel: ChannelType;
  notes?: string;
  createdAt: string;
  cancelledAt?: string;
  /** Motivo de la cancelación (se envía al cliente). */
  cancelReason?: string | null;
}

export interface Customer {
  id: string;
  fullName: string;
  contact: string;
  createdAt: string;
}

export interface BookingDraft {
  serviceId: string | null;
  serviceName: string | null;
  date: string | null;
  time: string | null;
  fullName: string | null;
  contact: string | null;
  awaitingConfirmation: boolean;
}

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: string;
  intent?: AIIntentType;
  parsedIntent?: ParsedAIIntent;
  rawJson?: string;
  latencyMs?: number;
  providerLabel?: string;
  suggestedSlots?: string[];
  isConfirmationPrompt?: boolean;
}

export interface Conversation {
  id: string;
  channel: ChannelType;
  customerName?: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessageItem[];
  draft: BookingDraft;
}
