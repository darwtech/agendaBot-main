import assert from 'node:assert/strict';
import { test } from 'node:test';
import { freeSlotsByDay } from './slots.js';

// 2026-11-23 es lunes.
const schedule = [
  { dayOfWeek: 1, closed: false, blocks: [{ start: '09:00', end: '12:00' }] },
  { dayOfWeek: 2, closed: true, blocks: [] },
  { dayOfWeek: 3, closed: false, blocks: [{ start: '15:00', end: '16:00' }] },
];
const base = { schedule, interval: 30, from: '2026-11-23', nowDate: '2026-11-22', nowTime: '20:00', days: 3, maxPerDay: 10 };

test('freeSlotsByDay respeta horario, duración, días cerrados y citas ocupadas', () => {
  const r = freeSlotsByDay({ ...base, durationMinutes: 60, busy: [{ date: '2026-11-23', time: '10:00', durationMinutes: 30 }] });
  assert.deepEqual(r, [
    { date: '2026-11-23', times: ['09:00', '10:30', '11:00'] },
    { date: '2026-11-25', times: ['15:00'] },
  ]);
});

test('freeSlotsByDay descarta las horas ya pasadas de hoy y limita por día', () => {
  const r = freeSlotsByDay({ ...base, durationMinutes: 30, busy: [], nowDate: '2026-11-23', nowTime: '10:15', maxPerDay: 2 });
  assert.deepEqual(r[0], { date: '2026-11-23', times: ['10:30', '11:00'] });
});
