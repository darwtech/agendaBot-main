import { EventEmitter } from 'node:events';
import type { RequestHandler } from 'express';

/** Qué cambió, para que el panel recargue solo eso. */
export type ChangeTopic = 'appointments' | 'customers' | 'conversations';

// shortcut: en memoria y por proceso; con varias instancias del backend, usar LISTEN/NOTIFY de PostgreSQL.
const bus = new EventEmitter();
bus.setMaxListeners(0); // un oyente por panel abierto

export function notifyChange(slug: string, ...topics: ChangeTopic[]) {
  for (const topic of new Set(topics)) bus.emit(slug, topic);
}

// Ruta que escribe → datos que cambian.
const TOPICS_BY_ROUTE: Record<string, ChangeTopic[]> = {
  appointments: ['appointments', 'customers'],
  customers: ['customers'],
  conversations: ['conversations'],
  whatsapp: ['conversations'],
};

/** Tras cualquier escritura correcta en el negocio, avisa a los paneles abiertos. */
export const notifyOnWrite: RequestHandler = (req, res, next) => {
  // req.path se lee aquí (relativo al negocio): Express lo reescribe mientras enruta.
  const topics = req.method === 'GET' ? undefined : TOPICS_BY_ROUTE[req.path.split('/')[1] ?? ''];
  if (topics) {
    res.on('finish', () => {
      if (req.tenant && res.statusCode < 400) notifyChange(req.tenant.slug, ...topics);
    });
  }
  next();
};

/** Server-Sent Events: el panel recibe {"topic": "..."} cada vez que algo cambia en su negocio. */
export const changesStream: RequestHandler = (req, res) => {
  const slug = req.tenant!.slug;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 3000\n\n');
  const send = (topic: ChangeTopic) => res.write(`data: ${JSON.stringify({ topic })}\n\n`);
  // Latido para que proxies y navegador no corten la conexión por inactividad.
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25_000);
  bus.on(slug, send);
  req.on('close', () => {
    clearInterval(heartbeat);
    bus.off(slug, send);
  });
};
