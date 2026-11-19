import { z } from 'zod';
import { timeStr } from '../appointments/appointments.schema.js';

const block = z
  .object({ start: timeStr, end: timeStr })
  .refine((b) => b.end > b.start, 'La hora de cierre debe ser posterior a la de apertura');

export const scheduleSchema = z
  .array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      closed: z.boolean(),
      blocks: z.array(block).max(10),
    })
  )
  .max(7);

export type DaySchedule = z.infer<typeof scheduleSchema>[number];
export type HoursRow = { id: string; day: number; start: string; end: string };

/** Pasa de filas (un tramo por fila) a la semana completa que usa el frontend. */
export function rowsToSchedule(rows: HoursRow[]): DaySchedule[] {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => {
    const blocks = rows
      .filter((r) => r.day === day)
      .map((r) => ({ start: r.start, end: r.end }))
      .sort((a, b) => a.start.localeCompare(b.start));
    return { dayOfWeek: day, closed: blocks.length === 0, blocks };
  });
}

/** Qué filas dar de baja y qué tramos crear para llegar a `next`, sin tocar lo que no cambia. */
export function diffSchedule(current: HoursRow[], next: DaySchedule[]) {
  const key = (day: number, start: string, end: string) => `${day}|${start}|${end}`;
  const wanted = new Map<string, { day: number; start: string; end: string }>();
  for (const d of next) {
    if (d.closed) continue;
    for (const b of d.blocks) wanted.set(key(d.dayOfWeek, b.start, b.end), { day: d.dayOfWeek, ...b });
  }
  const existing = new Set(current.map((r) => key(r.day, r.start, r.end)));
  return {
    remove: current.filter((r) => !wanted.has(key(r.day, r.start, r.end))).map((r) => r.id),
    add: [...wanted.entries()].filter(([k]) => !existing.has(k)).map(([, v]) => v),
  };
}
