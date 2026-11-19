import { z } from 'zod';
import { passwordSchema, userUpsertSchema } from '../auth/auth.schema.js';

export const BUSINESS_TYPES = [
  'barberia',
  'peluqueria',
  'estetica',
  'unas',
  'spa',
  'masajes',
  'clinica',
  'dental',
  'fisioterapia',
  'psicologia',
  'nutricion',
  'veterinaria',
  'gimnasio',
  'tatuajes',
  'taller',
  'asesoria',
  'otro',
] as const;

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Solo minúsculas, números y guiones (ej: spa-luna)')
  .min(2)
  .max(40);

export const tenantCreateSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(2).max(100),
  businessType: z.enum(BUSINESS_TYPES).default('otro'),
  timezone: z.string().optional(),
  currency: z.enum(['EUR', 'USD', 'MXN', 'COP', 'ARS']).optional(),
  // Usuario dueño que inicia sesión en el panel. Sin contraseña se genera una.
  owner: userUpsertSchema,
});

export const tenantPatchSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    businessType: z.enum(BUSINESS_TYPES),
    active: z.boolean(),
  })
  .partial();

export type TenantCreate = z.infer<typeof tenantCreateSchema>;
export type TenantPatch = z.infer<typeof tenantPatchSchema>;

/** spa-luna → t_spa_luna */
export const schemaForSlug = (slug: string) => `t_${slug.replace(/-/g, '_')}`;

/** Alta pública: el dueño crea su negocio y elige contraseña (obligatoria). La dirección se genera del nombre. */
export const signupSchema = tenantCreateSchema.omit({ slug: true }).extend({
  owner: userUpsertSchema.extend({ password: passwordSchema }),
});

/** "Barbería El Bigote" → "barberia-el-bigote". Deja hueco para un sufijo (-2, -3…) dentro de los 40 caracteres. */
export function slugFromName(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 34)
    .replace(/-+$/, '');
  return slug.length >= 2 ? slug : 'negocio';
}
