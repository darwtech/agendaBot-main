import type { DaySchedule } from '../schedule/schedule.schema.js';

export const DAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const toTime = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

export const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

/** Fecha y hora actuales en la zona horaria del negocio. */
export function localNow(tz: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value])
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return { date, time: `${parts.hour}:${parts.minute}`, weekday: DAYS_ES[weekday(date)] };
}

export interface FreeSlotsInput {
  schedule: DaySchedule[];
  busy: { date: string; time: string; durationMinutes: number }[];
  durationMinutes: number;
  interval: number;
  /** Primer día a revisar y hora actual (las horas de hoy ya pasadas no cuentan). */
  from: string;
  nowDate: string;
  nowTime: string;
  days: number;
  maxPerDay: number;
}

/** Horas libres por día: dentro del horario, en la cuadrícula del intervalo, sin solaparse con citas confirmadas. */
export function freeSlotsByDay(input: FreeSlotsInput): { date: string; times: string[] }[] {
  const result: { date: string; times: string[] }[] = [];
  for (let d = 0; d < input.days; d++) {
    const date = addDays(input.from, d);
    if (date < input.nowDate) continue;
    const day = input.schedule.find((s) => s.dayOfWeek === weekday(date));
    if (!day || day.closed) continue;
    const busy = input.busy
      .filter((b) => b.date === date)
      .map((b) => ({ start: toMin(b.time), end: toMin(b.time) + b.durationMinutes }));
    const times: string[] = [];
    for (const block of day.blocks) {
      const end = toMin(block.end);
      for (let t = toMin(block.start); t + input.durationMinutes <= end; t += input.interval) {
        if (date === input.nowDate && t <= toMin(input.nowTime)) continue;
        if (busy.some((b) => t < b.end && t + input.durationMinutes > b.start)) continue;
        times.push(toTime(t));
        if (times.length >= input.maxPerDay) break;
      }
      if (times.length >= input.maxPerDay) break;
    }
    if (times.length) result.push({ date, times });
  }
  return result;
}
