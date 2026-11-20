/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { createApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './db/pool.js';
import { restoreWhatsAppSessions } from './modules/whatsapp/whatsapp.service.js';

const server = createApp().listen(env.PORT, () => {
  console.log(`API en http://localhost:${env.PORT}/api (${env.NODE_ENV})`);
  if (!env.PLATFORM_TOKEN) console.warn('PLATFORM_TOKEN vacío: la API de plataforma está deshabilitada.');
  void restoreWhatsAppSessions();
});

server.on('error', (err: NodeJS.ErrnoException) => {
  console.error(err.code === 'EADDRINUSE' ? `El puerto ${env.PORT} ya está en uso.` : err);
  process.exit(1);
});

const shutdown = () => server.close(() => pool.end());
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
