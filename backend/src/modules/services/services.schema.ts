import { z } from 'zod';

export const serviceCreateSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).default(''),
  durationMinutes: z.number().int().min(5).max(480),
  price: z.number().min(0).max(100_000),
  active: z.boolean().default(true),
});

export const servicePatchSchema = serviceCreateSchema.omit({ id: true }).partial();

export type ServiceCreate = z.infer<typeof serviceCreateSchema>;
export type ServicePatch = z.infer<typeof servicePatchSchema>;
