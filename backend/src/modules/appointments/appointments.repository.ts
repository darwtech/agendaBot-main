/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { tdb, type Db } from '../../db/pool.js';

// $1 = zona horaria del negocio. Fecha y hora se devuelven en hora local del negocio.
const SELECT = `SELECT a.id, a.customer_id AS "customerId", c.full_name AS "customerName",
  coalesce(c.email, c.phone, c.whatsapp_jid) AS "customerContact", a.service_id AS "serviceId",
  s.name AS "serviceName", s.price::float AS price,
  (extract(epoch FROM a.ends_at - a.starts_at) / 60)::int AS "durationMinutes",
  to_char(a.starts_at AT TIME ZONE $1, 'YYYY-MM-DD') AS date,
  to_char(a.starts_at AT TIME ZONE $1, 'HH24:MI') AS time,
  a.status, a.channel, a.notes, a.cancel_reason AS "cancelReason", a.estado, a.created_at AS "createdAt",
  a.cancelled_at AS "cancelledAt", a.updated_at AS "updatedAt"
  FROM appointments a
  JOIN customers c ON c.id = a.customer_id
  JOIN services s ON s.id = a.service_id`;

export async function listAppointments(tz: string, range: { from?: string; to?: string }) {
  const { rows } = await tdb().query(
    `${SELECT} WHERE a.deleted_at IS NULL
       AND ($2::date IS NULL OR (a.starts_at AT TIME ZONE $1)::date >= $2::date)
       AND ($3::date IS NULL OR (a.starts_at AT TIME ZONE $1)::date <= $3::date)
     ORDER BY a.starts_at DESC`,
    [tz, range.from ?? null, range.to ?? null]
  );
  return rows;
}

export async function findAppointment(id: string, tz: string, db: Db = tdb()) {
  const { rows } = await db.query(`${SELECT} WHERE a.id = $2 AND a.deleted_at IS NULL`, [tz, id]);
  return rows[0] ?? null;
}

export async function isWithinBusinessHours(
  db: Db,
  date: string,
  time: string,
  durationMinutes: number
): Promise<boolean> {
  const { rows } = await db.query(
    `SELECT EXISTS (
       SELECT 1 FROM business_hours
       WHERE deleted_at IS NULL
         AND day_of_week = extract(dow FROM $1::date)
         AND opens_at <= $2::time
         AND $2::time + make_interval(mins => $3) <= closes_at
         AND $2::time + make_interval(mins => $3) > $2::time
     ) AS ok`,
    [date, time, durationMinutes]
  );
  return rows[0].ok;
}

export async function insertAppointment(
  db: Db,
  a: {
    id?: string;
    customerId: string;
    serviceId: string;
    date: string;
    time: string;
    durationMinutes: number;
    channel: string;
    notes?: string;
    tz: string;
    actor: string | null;
  }
): Promise<{ id: string; inPast: boolean }> {
  const { rows } = await db.query(
    `WITH t AS (SELECT ($4::date + $5::time) AT TIME ZONE $6 AS starts_at)
     INSERT INTO appointments (id, customer_id, service_id, starts_at, ends_at, channel, notes, created_by, updated_by)
     SELECT coalesce($1, gen_random_uuid()), $2, $3, t.starts_at, t.starts_at + make_interval(mins => $7),
            $8, $9, $10, $10
     FROM t RETURNING id, starts_at <= now() AS "inPast"`,
    [a.id ?? null, a.customerId, a.serviceId, a.date, a.time, a.tz, a.durationMinutes, a.channel, a.notes ?? null, a.actor]
  );
  return rows[0];
}

export async function updateAppointment(
  id: string,
  patch: { status?: string; notes?: string; cancelReason?: string },
  actor: string | null,
  db: Db = tdb()
): Promise<boolean> {
  const { rowCount } = await db.query(
    `UPDATE appointments SET
       status = coalesce($2, status),
       notes = coalesce($3, notes),
       cancel_reason = CASE WHEN $2 = 'confirmed' THEN NULL ELSE coalesce($5, cancel_reason) END,
       cancelled_at = CASE WHEN $2 = 'cancelled' AND status <> 'cancelled' THEN now()
                           WHEN $2 = 'confirmed' THEN NULL ELSE cancelled_at END,
       updated_by = $4
     WHERE id = $1 AND deleted_at IS NULL`,
    [id, patch.status ?? null, patch.notes ?? null, actor, patch.cancelReason ?? null]
  );
  return rowCount === 1;
}

/** Cambia servicio, fecha u hora de una cita. Devuelve si la nueva hora ya pasó (para deshacer con rollback). */
export async function moveAppointment(
  db: Db,
  a: { id: string; serviceId: string; date: string; time: string; durationMinutes: number; tz: string; actor: string | null }
): Promise<{ inPast: boolean } | null> {
  const { rows } = await db.query(
    `WITH t AS (SELECT ($3::date + $4::time) AT TIME ZONE $5 AS starts_at)
     UPDATE appointments SET service_id = $2, starts_at = t.starts_at,
       ends_at = t.starts_at + make_interval(mins => $6), updated_by = $7
     FROM t WHERE id = $1 AND deleted_at IS NULL
     RETURNING appointments.starts_at <= now() AS "inPast"`,
    [a.id, a.serviceId, a.date, a.time, a.tz, a.durationMinutes, a.actor]
  );
  return rows[0] ?? null;
}

export async function softDeleteAppointment(id: string, actor: string | null): Promise<boolean> {
  const { rowCount } = await tdb().query(
    'UPDATE appointments SET deleted_at = now(), updated_by = $2 WHERE id = $1 AND deleted_at IS NULL',
    [id, actor]
  );
  return rowCount === 1;
}
