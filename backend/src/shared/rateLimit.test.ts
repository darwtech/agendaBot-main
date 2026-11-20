/**
 * HopperSoft — Creador: Darwin Chavez
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertNotLocked, clearFailures, recordFailure } from './rateLimit.js';

test('bloquea tras 10 fallos y se libera al pasar la ventana o al acertar', () => {
  const key = 'test|1.2.3.4';
  const t0 = 1_000_000;
  for (let i = 0; i < 10; i++) {
    assertNotLocked(key, t0);
    recordFailure(key, t0);
  }
  assert.throws(() => assertNotLocked(key, t0), /Demasiados intentos/);
  assert.doesNotThrow(() => assertNotLocked(key, t0 + 15 * 60_000 + 1));

  for (let i = 0; i < 10; i++) recordFailure(key, t0);
  clearFailures(key);
  assert.doesNotThrow(() => assertNotLocked(key, t0));
});
