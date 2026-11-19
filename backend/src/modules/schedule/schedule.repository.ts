import { tdb, tenantTransaction, type Db } from '../../db/pool.js';
import { diffSchedule, rowsToSchedule, type DaySchedule, type HoursRow } from './schedule.schema.js';

async function currentRows(db: Db): Promise<HoursRow[]> {
  const { rows } = await db.query<HoursRow>(
    `SELECT id, day_of_week AS day, to_char(opens_at, 'HH24:MI') AS start, to_char(closes_at, 'HH24:MI') AS "end"
     FROM business_hours WHERE deleted_at IS NULL`
  );
  return rows;
}

export async function getSchedule(): Promise<DaySchedule[]> {
  return rowsToSchedule(await currentRows(tdb()));
}

export async function replaceSchedule(next: DaySchedule[], actor: string | null): Promise<DaySchedule[]> {
  return tenantTransaction(async (db) => {
    const { remove, add } = diffSchedule(await currentRows(db), next);
    if (remove.length) {
      await db.query(
        'UPDATE business_hours SET deleted_at = now(), updated_by = $2 WHERE id = ANY($1::uuid[])',
        [remove, actor]
      );
    }
    for (const b of add) {
      await db.query(
        `INSERT INTO business_hours (day_of_week, opens_at, closes_at, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $4)`,
        [b.day, b.start, b.end, actor]
      );
    }
    return rowsToSchedule(await currentRows(db));
  });
}
