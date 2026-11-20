/**
 * HopperSoft — Creador: Darwin Chavez
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { slugFromName, slugSchema } from './tenants.schema.js';

test('slugFromName genera una dirección válida a partir del nombre', () => {
  assert.equal(slugFromName('Barbería El Bigote'), 'barberia-el-bigote');
  assert.equal(slugFromName('  Uñas & Spa  Luna!! '), 'unas-spa-luna');
  assert.equal(slugFromName('!!!'), 'negocio');
  const long = slugFromName('a'.repeat(30) + ' ' + 'b'.repeat(30));
  assert.ok(long.length <= 34 && !long.endsWith('-'));
  for (const name of ['Barbería El Bigote', '日本', 'x', long]) slugSchema.parse(slugFromName(name));
});
