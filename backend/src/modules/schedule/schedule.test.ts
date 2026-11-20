/**
 * HopperSoft — Creador: Darwin Chavez
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { diffSchedule, rowsToSchedule } from './schedule.schema.js';

const rows = [
  { id: 'a', day: 1, start: '10:00', end: '14:00' },
  { id: 'b', day: 1, start: '16:00', end: '20:00' },
];

test('rowsToSchedule marca como cerrados los días sin tramos', () => {
  const week = rowsToSchedule(rows);
  assert.equal(week.length, 7);
  assert.deepEqual(week[1].blocks.length, 2);
  assert.equal(week[0].closed, true);
});

test('diffSchedule solo toca lo que cambia', () => {
  const next = [
    { dayOfWeek: 1, closed: false, blocks: [{ start: '10:00', end: '14:00' }, { start: '16:00', end: '21:00' }] },
  ];
  assert.deepEqual(diffSchedule(rows, next), {
    remove: ['b'],
    add: [{ day: 1, start: '16:00', end: '21:00' }],
  });
});

test('diffSchedule ignora tramos de días cerrados', () => {
  const next = [{ dayOfWeek: 1, closed: true, blocks: [{ start: '10:00', end: '14:00' }] }];
  assert.deepEqual(diffSchedule(rows, next), { remove: ['a', 'b'], add: [] });
});
