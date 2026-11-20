/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { tdb } from '../../db/pool.js';
import type { ConversationCreate, ConversationPatch } from './conversations.schema.js';

const SELECT = `SELECT id, channel, external_id AS "externalId", context->>'customerName' AS "customerName",
  coalesce(context->'messages', '[]'::jsonb) AS messages,
  coalesce(context->'draft', '{}'::jsonb) AS draft,
  estado, created_at AS "createdAt", updated_at AS "updatedAt"
  FROM conversations`;

export async function listConversations(limit = 200) {
  const { rows } = await tdb().query(
    `${SELECT} WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT $1`,
    [limit]
  );
  return rows;
}

export async function findConversation(id: string) {
  const { rows } = await tdb().query(`${SELECT} WHERE id = $1 AND deleted_at IS NULL`, [id]);
  return rows[0] ?? null;
}

/** `externalId` = identificador del canal (JID de WhatsApp); por defecto, el propio id. */
export async function createConversation(data: ConversationCreate, actor: string | null, externalId?: string) {
  const { id, channel, ...context } = data;
  await tdb().query(
    `INSERT INTO conversations (id, channel, external_id, context, created_by, updated_by)
     VALUES ($1::text::uuid, $2, coalesce($5, $1::text), $3::jsonb, $4, $4)`,
    [id, channel, JSON.stringify(context), actor, externalId ?? null]
  );
  return findConversation(id);
}

export async function findConversationByExternalId(channel: string, externalId: string) {
  const { rows } = await tdb().query(
    `${SELECT} WHERE channel = $1 AND external_id = $2 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1`,
    [channel, externalId]
  );
  return rows[0] ?? null;
}

export async function findExternalId(id: string): Promise<{ channel: string; externalId: string } | null> {
  const { rows } = await tdb().query(
    'SELECT channel, external_id AS "externalId" FROM conversations WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  return rows[0] ?? null;
}

export async function updateConversation(id: string, patch: ConversationPatch, actor: string | null) {
  const { rowCount } = await tdb().query(
    `UPDATE conversations SET context = context || $2::jsonb, updated_by = $3
     WHERE id = $1 AND deleted_at IS NULL`,
    [id, JSON.stringify(patch), actor]
  );
  return rowCount === 1 ? findConversation(id) : null;
}

export async function softDeleteConversation(id: string, actor: string | null): Promise<boolean> {
  const { rowCount } = await tdb().query(
    'UPDATE conversations SET deleted_at = now(), updated_by = $2 WHERE id = $1 AND deleted_at IS NULL',
    [id, actor]
  );
  return rowCount === 1;
}

/** Chat de WhatsApp de un teléfono: por su JID o por el teléfono guardado (cuando WhatsApp usa LID). */
export async function findWhatsAppConversationByPhone(phone: string) {
  const { rows } = await tdb().query(
    `${SELECT} WHERE channel = 'whatsapp' AND deleted_at IS NULL
       AND (external_id = $1 || '@s.whatsapp.net' OR context->'draft'->>'phone' = $1)
     ORDER BY updated_at DESC LIMIT 1`,
    [phone]
  );
  return rows[0] ?? null;
}
