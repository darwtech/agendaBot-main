/**
 * HopperSoft — Creador: Darwin Chavez
 */
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import express from 'express';
import { changesStream, notifyOnWrite } from './events.js';

test('una escritura en /appointments llega en vivo a /events del mismo negocio', async () => {
  const app = express();
  const tenant = express.Router();
  tenant.use((req, _res, next) => {
    req.tenant = { id: '1', slug: String(req.params.slug ?? 'spa'), name: 'Spa', businessType: 'spa', schema: 't_spa' };
    next();
  });
  tenant.use(notifyOnWrite);
  tenant.get('/events', changesStream);
  tenant.post('/appointments', (_req, res) => res.status(201).json({}));
  tenant.post('/services', (_req, res) => res.status(201).json({}));
  app.use('/api/t/spa', tenant);
  const server = app.listen(0);
  const base = `http://localhost:${(server.address() as AddressInfo).port}/api/t/spa`;
  const ctrl = new AbortController();
  try {
    const res = await fetch(`${base}/events`, { signal: ctrl.signal });
    assert.equal(res.headers.get('content-type'), 'text/event-stream; charset=utf-8');
    const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
    await reader.read(); // "retry: 3000"
    await fetch(`${base}/services`, { method: 'POST' }); // no avisa: el panel no lo necesita en vivo
    await fetch(`${base}/appointments`, { method: 'POST' });
    let text = '';
    while (!text.includes('customers')) text += (await reader.read()).value;
    assert.match(text, /data: \{"topic":"appointments"\}/);
    assert.match(text, /data: \{"topic":"customers"\}/);
    assert.doesNotMatch(text, /services/);
  } finally {
    ctrl.abort();
    server.closeAllConnections();
    server.close();
  }
});
