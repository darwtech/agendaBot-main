import { tdb, type Db } from '../../db/pool.js';
import { buildUpdate } from '../../shared/sql.js';
import type { ServiceCreate, ServicePatch } from './services.schema.js';

const SELECT = `SELECT id, name, coalesce(description, '') AS "description",
  duration_minutes AS "durationMinutes", price::float AS price, is_active AS active,
  estado, created_at AS "createdAt", updated_at AS "updatedAt"
  FROM services`;

const COLUMNS = {
  name: 'name',
  description: 'description',
  durationMinutes: 'duration_minutes',
  price: 'price',
  active: 'is_active',
};

export async function listServices(onlyActive: boolean) {
  const where = onlyActive ? 'AND is_active' : '';
  const { rows } = await tdb().query(`${SELECT} WHERE deleted_at IS NULL ${where} ORDER BY name`);
  return rows;
}

export async function findService(id: string, db: Db = tdb()) {
  const { rows } = await db.query(`${SELECT} WHERE id = $1 AND deleted_at IS NULL`, [id]);
  return rows[0] ?? null;
}

export async function createService(data: ServiceCreate, actor: string | null) {
  const { rows } = await tdb().query(
    `INSERT INTO services (id, name, description, duration_minutes, price, is_active, created_by, updated_by)
     VALUES (coalesce($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $7) RETURNING id`,
    [data.id ?? null, data.name, data.description, data.durationMinutes, data.price, data.active, actor]
  );
  return findService(rows[0].id);
}

export async function updateService(id: string, patch: ServicePatch, actor: string | null) {
  const update = buildUpdate(COLUMNS, patch, actor, 2);
  if (update) {
    await tdb().query(`UPDATE services SET ${update.set} WHERE id = $1 AND deleted_at IS NULL`, [
      id,
      ...update.values,
    ]);
  }
  return findService(id);
}

export async function softDeleteService(id: string, actor: string | null): Promise<boolean> {
  const { rowCount } = await tdb().query(
    'UPDATE services SET deleted_at = now(), updated_by = $2 WHERE id = $1 AND deleted_at IS NULL',
    [id, actor]
  );
  return rowCount === 1;
}
