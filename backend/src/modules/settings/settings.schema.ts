import { z } from 'zod';

const timezone = z.string().refine((tz) => {
  try {
    new Intl.DateTimeFormat('es', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}, 'Zona horaria IANA inválida');

// adminPin y pinChangedFromDefault no se guardan: en modo API el acceso es por ADMIN_TOKEN.
export const settingsPatchSchema = z
  .object({
    businessName: z.string().trim().min(2).max(80),
    timezone,
    slotInterval: z.union([z.literal(15), z.literal(30), z.literal(60)]),
    currency: z.enum(['EUR', 'USD', 'MXN', 'COP', 'ARS']),
    theme: z.enum(['light', 'dark', 'system']),
    accentColor: z.enum(['emerald', 'blue', 'amber', 'rose', 'slate']),
    systemPrompt: z.string().max(10_000),
    timeoutSeconds: z.number().int().min(3).max(120),
    historyTurns: z.number().int().min(0).max(50),
    maxSlotsShown: z.number().int().min(1).max(20),
    whatsappStatus: z.enum(['disconnected', 'qr', 'connected']),
    // Datos del establecimiento que usa el asistente de WhatsApp.
    address: z.string().trim().max(200),
    phone: z.string().trim().max(40),
    businessInfo: z.string().max(4_000),
    welcomeMessage: z.string().max(1_000),
  })
  .partial();

export type SettingsPatch = z.infer<typeof settingsPatchSchema>;
