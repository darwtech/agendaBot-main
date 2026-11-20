/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { z } from 'zod';

export const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD');
export const timeStr = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato HH:MM');

// Precio, duración y nombres se toman del servidor, no del cliente.
export const appointmentCreateSchema = z.object({
  id: z.uuid().optional(),
  customerName: z.string().trim().min(2).max(100),
  customerContact: z.string().trim().min(5).max(120),
  serviceId: z.uuid(),
  date: dateStr,
  time: timeStr,
  channel: z.enum(['web', 'whatsapp', 'api']).default('web'),
  notes: z.string().trim().max(500).optional(),
});

export const appointmentPatchSchema = z
  .object({
    status: z.enum(['confirmed', 'cancelled']).optional(),
    notes: z.string().trim().max(500).optional(),
    // Obligatorio al cancelar: se envía al cliente.
    cancelReason: z.string().trim().min(3, 'Indica el motivo de la cancelación').max(500).optional(),
    // Reprogramar: servicio, fecha y/o hora.
    serviceId: z.uuid().optional(),
    date: dateStr.optional(),
    time: timeStr.optional(),
  })
  .refine((p) => p.status !== 'cancelled' || p.cancelReason, {
    message: 'Indica el motivo de la cancelación',
    path: ['cancelReason'],
  });

export const appointmentListQuery = z.object({
  from: dateStr.optional(),
  to: dateStr.optional(),
});

export type AppointmentCreate = z.infer<typeof appointmentCreateSchema>;
export type AppointmentPatch = z.infer<typeof appointmentPatchSchema>;
