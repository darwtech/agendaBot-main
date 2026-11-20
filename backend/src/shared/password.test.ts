/**
 * HopperSoft — Creador: Darwin Chavez
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashPassword, verifyPassword } from './password.js';

test('hashPassword/verifyPassword', async () => {
  const stored = await hashPassword('Secreta123!');
  assert.match(stored, /^scrypt\$/);
  assert.ok(!stored.includes('Secreta123!'));
  assert.equal(await verifyPassword('Secreta123!', stored), true);
  assert.equal(await verifyPassword('secreta123!', stored), false);
  assert.notEqual(await hashPassword('Secreta123!'), stored, 'sal aleatoria');
  assert.equal(await verifyPassword('x', 'basura'), false);
});
