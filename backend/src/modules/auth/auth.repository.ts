/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { tdb, type Db } from '../../db/pool.js';
import { hashPassword } from '../../shared/password.js';
import type { UserUpsert } from './auth.schema.js';

export const SESSION_HOURS = 12;

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
}

export async function findUserByEmail(email: string) {
  const { rows } = await tdb().query<SessionUser & { passwordHash: string }>(
    `SELECT id, email, full_name AS "fullName", password_hash AS "passwordHash"
     FROM users WHERE email = $1 AND deleted_at IS NULL`,
    [email]
  );
  return rows[0] ?? null;
}

/** Abre una sesión y anota el inicio de sesión del usuario (queda en la auditoría). */
export async function createSession(userId: string, tokenHash: string): Promise<string> {
  const { rows } = await tdb().query<{ expiresAt: string }>(
    `WITH login AS (
       UPDATE users SET last_login_at = now(), updated_by = $1 WHERE id = $1
     )
     INSERT INTO sessions (user_id, token_hash, expires_at, created_by, updated_by)
     VALUES ($1, $2, now() + make_interval(hours => $3), $1, $1)
     RETURNING expires_at AS "expiresAt"`,
    [userId, tokenHash, SESSION_HOURS]
  );
  return rows[0].expiresAt;
}

export async function findSessionUser(tokenHash: string): Promise<SessionUser | null> {
  const { rows } = await tdb().query<SessionUser>(
    `SELECT u.id, u.email, u.full_name AS "fullName"
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.deleted_at IS NULL AND s.expires_at > now() AND u.deleted_at IS NULL`,
    [tokenHash]
  );
  return rows[0] ?? null;
}

export async function revokeSession(tokenHash: string, actor: string): Promise<void> {
  await tdb().query(
    'UPDATE sessions SET deleted_at = now(), updated_by = $2 WHERE token_hash = $1 AND deleted_at IS NULL',
    [tokenHash, actor]
  );
}

/**
 * Crea el usuario o, si el correo ya existe, actualiza su nombre y contraseña
 * y cierra sus sesiones abiertas. `db` debe estar ya en el schema del negocio.
 */
export async function upsertUser(db: Db, user: Required<UserUpsert>, actor: string | null) {
  const passwordHash = await hashPassword(user.password);
  const { rows } = await db.query<{ id: string; created: boolean }>(
    `WITH existing AS (SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL),
     updated AS (
       UPDATE users SET full_name = $2, password_hash = $3, updated_by = $4
       WHERE id IN (SELECT id FROM existing) RETURNING id, false AS created
     ),
     inserted AS (
       INSERT INTO users (email, full_name, password_hash, created_by, updated_by)
       SELECT $1, $2, $3, $4, $4 WHERE NOT EXISTS (SELECT 1 FROM existing)
       RETURNING id, true AS created
     )
     SELECT * FROM updated UNION ALL SELECT * FROM inserted`,
    [user.email, user.fullName, passwordHash, actor]
  );
  const { id, created } = rows[0];
  if (!created) {
    await db.query(
      'UPDATE sessions SET deleted_at = now(), updated_by = $2 WHERE user_id = $1 AND deleted_at IS NULL',
      [id, actor]
    );
  }
  return { id, created };
}
