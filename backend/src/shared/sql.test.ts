/**
 * HopperSoft — Creador: Darwin Chavez
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildUpdate, splitContact } from './sql.js';

test('buildUpdate ignora undefined y añade updated_by', () => {
  const r = buildUpdate({ name: 'name', price: 'price' }, { name: 'Corte', price: undefined }, 'actor', 2);
  assert.deepEqual(r, { set: 'name = $2, updated_by = $3', values: ['Corte', 'actor'] });
  assert.equal(buildUpdate({ name: 'name' }, {}, null), null);
});

test('splitContact distingue email, teléfono y chat de WhatsApp sin número', () => {
  assert.deepEqual(splitContact(' Ana@Mail.com '), { phone: null, email: 'ana@mail.com', whatsappJid: null });
  assert.deepEqual(splitContact('+34 600-111-222'), { phone: '34600111222', email: null, whatsappJid: null });
  assert.deepEqual(splitContact('123456789@lid'), { phone: null, email: null, whatsappJid: '123456789@lid' });
});
