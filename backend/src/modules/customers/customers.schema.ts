/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { z } from 'zod';

const contact = z
  .string()
  .trim()
  .min(5)
  .max(120)
  .refine(
    (v) => (v.includes('@') ? /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) : /^[0-9]{7,15}$/.test(v.replace(/\D/g, ''))),
    'Debe ser un email o un teléfono de 7 a 15 dígitos'
  );

export const customerCreateSchema = z.object({
  id: z.uuid().optional(),
  fullName: z.string().trim().min(2).max(100),
  contact,
});

export const customerPatchSchema = customerCreateSchema.omit({ id: true }).partial();

export type CustomerCreate = z.infer<typeof customerCreateSchema>;
export type CustomerPatch = z.infer<typeof customerPatchSchema>;
