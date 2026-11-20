/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { tdb, type Db } from '../../db/pool.js';
import { buildUpdate, splitContact } from '../../shared/sql.js';
import type { CustomerCreate, CustomerPatch } from './customers.schema.js';

const SELECT = `SELECT id, full_name AS "fullName", coalesce(email, phone, whatsapp_jid) AS contact,
  estado, created_at AS "createdAt", updated_at AS "updatedAt"
  FROM customers`;

export async function listCustomers() {
  const { rows } = await tdb().query(`${SELECT} WHERE deleted_at IS NULL ORDER BY created_at DESC`);
  return rows;
}

export async function findCustomer(id: string, db: Db = tdb()) {
  const { rows } = await db.query(`${SELECT} WHERE id = $1 AND deleted_at IS NULL`, [id]);
  return rows[0] ?? null;
}

export async function findCustomerByContact(contact: string, db: Db = tdb()) {
  const { phone, email, whatsappJid } = splitContact(contact);
  const { rows } = await db.query(
    `${SELECT} WHERE deleted_at IS NULL AND (phone = $1 OR email = $2 OR whatsapp_jid = $3) LIMIT 1`,
    [phone, email, whatsappJid]
  );
  return rows[0] ?? null;
}

/** Devuelve el cliente existente con ese contacto o lo crea. `created` indica si es nuevo. */
export async function findOrCreateCustomer(data: CustomerCreate, actor: string | null, db: Db = tdb()) {
  const existing = await findCustomerByContact(data.contact, db);
  if (existing) return { customer: existing, created: false };
  const { phone, email, whatsappJid } = splitContact(data.contact);
  const { rows } = await db.query(
    `INSERT INTO customers (id, full_name, phone, email, whatsapp_jid, created_by, updated_by)
     VALUES (coalesce($1, gen_random_uuid()), $2, $3, $4, $5, $6, $6) RETURNING id`,
    [data.id ?? null, data.fullName, phone, email, whatsappJid, actor]
  );
  return { customer: await findCustomer(rows[0].id, db), created: true };
}

export async function updateCustomer(id: string, patch: CustomerPatch, actor: string | null) {
  const fields: Record<string, unknown> = { fullName: patch.fullName };
  if (patch.contact !== undefined) Object.assign(fields, splitContact(patch.contact));
  const update = buildUpdate({ fullName: 'full_name', phone: 'phone', email: 'email', whatsappJid: 'whatsapp_jid' }, fields, actor, 2);
  if (update) {
    await tdb().query(`UPDATE customers SET ${update.set} WHERE id = $1 AND deleted_at IS NULL`, [
      id,
      ...update.values,
    ]);
  }
  return findCustomer(id);
}

export async function softDeleteCustomer(id: string, actor: string | null): Promise<boolean> {
  const { rowCount } = await tdb().query(
    'UPDATE customers SET deleted_at = now(), updated_by = $2 WHERE id = $1 AND deleted_at IS NULL',
    [id, actor]
  );
  return rowCount === 1;
}
