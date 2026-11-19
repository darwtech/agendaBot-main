import { env } from '../../config/env.js';
import { migrateTenantSchema } from '../../db/migrations.js';
import { pool, useSchema, withTransaction } from '../../db/pool.js';
import { generateToken } from '../../shared/auth.js';
import { HttpError, notFound } from '../../shared/http.js';
import { upsertUser } from '../auth/auth.repository.js';
import type { UserUpsert } from '../auth/auth.schema.js';
import { schemaForSlug, type TenantCreate, type TenantPatch } from './tenants.schema.js';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  businessType: string;
  schema: string;
}

const SELECT = `SELECT id, slug, name, business_type AS "businessType", schema_name AS schema,
  estado, created_at AS "createdAt", updated_at AS "updatedAt"
  FROM public.tenants`;

export async function findActiveTenant(slug: string): Promise<Tenant | null> {
  const { rows } = await pool.query(`${SELECT} WHERE slug = $1 AND deleted_at IS NULL`, [slug]);
  return rows[0] ?? null;
}

export async function listTenants() {
  const { rows } = await pool.query(`${SELECT} ORDER BY created_at`);
  return rows;
}

/** Primera dirección libre: base, base-2, base-3… (también cuenta las de negocios dados de baja). */
export async function freeSlug(base: string): Promise<string> {
  const { rows } = await pool.query<{ slug: string }>(
    "SELECT slug FROM public.tenants WHERE slug = $1 OR slug LIKE $1 || '-%'",
    [base]
  );
  const taken = new Set(rows.map((r) => r.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

/** Devuelve la contraseña solo si se generó aquí (para mostrarla una única vez). */
function withPassword(user: UserUpsert) {
  const generated = user.password ? null : generateToken();
  return { user: { ...user, password: user.password ?? generated! }, generated };
}

/** Crea schema + tablas + ajustes + usuario dueño + registro, todo o nada. */
export async function createTenant(data: TenantCreate, actor: string | null) {
  const schema = schemaForSlug(data.slug);
  const { user, generated } = withPassword(data.owner);
  return withTransaction(async (c) => {
    const exists = await c.query('SELECT 1 FROM public.tenants WHERE slug = $1 OR schema_name = $2', [
      data.slug,
      schema,
    ]);
    if (exists.rowCount) throw new HttpError(409, `Ya existe un negocio con el identificador "${data.slug}"`);

    const { rows } = await c.query(
      `INSERT INTO public.tenants (slug, name, business_type, schema_name, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $5) RETURNING id`,
      [data.slug, data.name, data.businessType, schema, actor]
    );
    await migrateTenantSchema(c, schema);
    await c.query('INSERT INTO business_settings (data, created_by, updated_by) VALUES ($1::jsonb, $2, $2)', [
      JSON.stringify({
        businessName: data.name,
        timezone: data.timezone ?? env.BUSINESS_TIMEZONE,
        currency: 'USD', // solo dólares
      }),
      actor,
    ]);
    await upsertUser(c, user, actor);
    return {
      id: rows[0].id as string,
      slug: data.slug,
      schema,
      owner: { email: user.email, ...(generated ? { password: generated } : {}) },
    };
  });
}

export async function updateTenant(slug: string, patch: TenantPatch, actor: string | null) {
  const { rowCount } = await pool.query(
    `UPDATE public.tenants SET
       name = coalesce($2, name),
       business_type = coalesce($3, business_type),
       deleted_at = CASE WHEN $4::boolean IS NULL THEN deleted_at
                         WHEN $4 THEN NULL ELSE coalesce(deleted_at, now()) END,
       updated_by = $5
     WHERE slug = $1`,
    [slug, patch.name ?? null, patch.businessType ?? null, patch.active ?? null, actor]
  );
  if (!rowCount) throw notFound('Negocio');
  return (await listTenants()).find((t) => t.slug === slug);
}

/** Crea un usuario del panel o restablece su contraseña (cierra sus sesiones). */
export async function setTenantUser(slug: string, input: UserUpsert, actor: string | null) {
  const { rows } = await pool.query<{ schema_name: string }>(
    'SELECT schema_name FROM public.tenants WHERE slug = $1',
    [slug]
  );
  if (!rows[0]) throw notFound('Negocio');
  const { user, generated } = withPassword(input);
  const { created } = await withTransaction(async (c) => {
    await useSchema(c, rows[0].schema_name);
    return upsertUser(c, user, actor);
  });
  return { email: user.email, created, ...(generated ? { password: generated } : {}) };
}
