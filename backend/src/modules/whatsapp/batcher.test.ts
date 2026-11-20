/**
 * HopperSoft — Creador: Darwin Chavez
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';
import { createBatcher } from './batcher.js';

test('createBatcher junta los mensajes seguidos y respeta la espera máxima', async () => {
  const flushed: [string, string[]][] = [];
  const b = createBatcher<string>((k, items) => flushed.push([k, items]), { quietMs: 40, maxWaitMs: 100 });
  b.push('a', 'hola');
  b.push('b', 'otro chat');
  await sleep(20);
  b.push('a', 'quiero cita');
  await sleep(20);
  b.push('a', 'para mañana');
  assert.ok(!flushed.some(([k]) => k === 'a'), 'el chat "a" sigue escribiendo: aún no se responde');
  await sleep(80);
  assert.deepEqual(flushed.sort(), [
    ['a', ['hola', 'quiero cita', 'para mañana']],
    ['b', ['otro chat']],
  ]);

  // Si no para de escribir, se responde igualmente al llegar a maxWaitMs.
  flushed.length = 0;
  for (let i = 0; i < 6; i++) {
    b.push('c', `m${i}`);
    await sleep(25);
  }
  await sleep(60);
  assert.ok(flushed.length >= 2, 'debe haber cortado el lote por la espera máxima');
  assert.deepEqual(flushed.flatMap(([, items]) => items), ['m0', 'm1', 'm2', 'm3', 'm4', 'm5']);
});
