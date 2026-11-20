/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email('Correo inválido').max(200);
export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(200);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Introduce la contraseña').max(200),
});

/** Alta o cambio de contraseña de un usuario del panel (CLI y plataforma). Sin contraseña se genera una. */
export const userUpsertSchema = z.object({
  email: emailSchema,
  fullName: z.string().trim().min(2).max(100),
  password: passwordSchema.optional(),
});

export type UserUpsert = z.infer<typeof userUpsertSchema>;
