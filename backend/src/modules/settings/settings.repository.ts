/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { env } from '../../config/env.js';
import { tdb, type Db } from '../../db/pool.js';
import type { SettingsPatch } from './settings.schema.js';

export async function getSettings(db: Db = tdb()): Promise<SettingsPatch> {
  const { rows } = await db.query('SELECT data FROM business_settings WHERE deleted_at IS NULL LIMIT 1');
  return rows[0]?.data ?? {};
}

export async function getTimezone(db: Db = tdb()): Promise<string> {
  return (await getSettings(db)).timezone ?? env.BUSINESS_TIMEZONE;
}

export async function updateSettings(patch: SettingsPatch, actor: string | null): Promise<SettingsPatch> {
  const { rows } = await tdb().query(
    `UPDATE business_settings SET data = data || $1::jsonb, updated_by = $2
     WHERE deleted_at IS NULL RETURNING data`,
    [JSON.stringify(patch), actor]
  );
  return rows[0].data;
}
