/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { existsSync } from 'node:fs';
import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import makeWASocket, { DisconnectReason, useMultiFileAuthState, type WAMessage, type WASocket } from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import { answerMessage, MAX_STORED_MESSAGES, message, type StoredMessage } from '../assistant/assistant.service.js';
import { findConversationByExternalId, findWhatsAppConversationByPhone, updateConversation } from '../conversations/conversations.repository.js';
import { splitContact } from '../../shared/sql.js';
import { findActiveTenant } from '../platform/tenants.repository.js';
import { createBatcher } from './batcher.js';
import { notifyChange } from '../../shared/events.js';

const AUTH_ROOT = path.join(process.cwd(), 'data', 'whatsapp-auth');
const FALLBACK_REPLY = 'Ahora mismo no puedo responder. Te contestamos en breve 🙏';
const ONLY_TEXT_REPLY = 'Por ahora solo puedo leer mensajes de texto. ¿Me lo escribes, por favor?';

export type WhatsAppState = { status: 'disconnected' | 'connecting' | 'qr' | 'connected'; qrDataUrl?: string; phone?: string; error?: string };
type Session = WhatsAppState & { socket?: WASocket; reconnecting?: boolean };
const sessions = new Map<string, Session>();

export function whatsappStatus(slug: string): WhatsAppState {
  const { socket: _socket, reconnecting: _reconnecting, ...state } = sessions.get(slug) ?? { status: 'disconnected' as const };
  return state;
}

export async function connectWhatsApp(slug: string) {
  const current = sessions.get(slug);
  if (current?.status === 'connected' || current?.status === 'connecting' || current?.status === 'qr') return whatsappStatus(slug);
  const session: Session = { status: 'connecting' };
  sessions.set(slug, session);
  const authPath = path.join(AUTH_ROOT, slug);
  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const socket = makeWASocket({ auth: state, markOnlineOnConnect: false, syncFullHistory: false });
  session.socket = socket;
  socket.ev.on('creds.update', saveCreds);
  socket.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return; // 'append' = historial al reconectar: no se contesta
    for (const m of messages) handleIncoming(slug, socket, m);
  });
  socket.ev.on('connection.update', async ({ connection, qr, lastDisconnect }) => {
    if (qr) { session.status = 'qr'; session.qrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 280 }); }
    if (connection === 'open') { session.status = 'connected'; session.qrDataUrl = undefined; session.error = undefined; session.phone = socket.user?.id?.split(':')[0]?.split('@')[0]; }
    if (connection === 'close') {
      const code = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;
      session.socket = undefined;
      if (code === DisconnectReason.loggedOut) {
        // Sesión cerrada desde el móvil: se borran las credenciales para que el próximo «Conectar» pida QR nuevo.
        sessions.set(slug, { status: 'disconnected' });
        await rm(authPath, { recursive: true, force: true });
        return;
      }
      session.status = 'disconnected';
      if (!session.reconnecting) { session.reconnecting = true; setTimeout(() => { sessions.delete(slug); void connectWhatsApp(slug); }, 1_500); }
    }
  });
  return whatsappStatus(slug);
}

export async function disconnectWhatsApp(slug: string) {
  const session = sessions.get(slug);
  if (session?.socket) await session.socket.logout().catch(() => undefined);
  sessions.set(slug, { status: 'disconnected' });
  await rm(path.join(AUTH_ROOT, slug), { recursive: true, force: true });
}

/**
 * Aviso del negocio al cliente (cancelación, cambio de cita…): va a su chat de WhatsApp si existe, si no a su número,
 * y queda guardado en la conversación. Llamar dentro del contexto del negocio. Devuelve false si no se pudo enviar.
 */
export async function notifyCustomer(slug: string, contact: string, text: string): Promise<boolean> {
  const socket = sessions.get(slug)?.socket;
  if (!socket || whatsappStatus(slug).status !== 'connected') return false;
  const { phone, whatsappJid } = splitContact(contact);
  let conversation;
  let to: string;
  if (whatsappJid) {
    // Cliente sin número visible: se le escribe a su propio chat.
    conversation = await findConversationByExternalId('whatsapp', whatsappJid);
    to = whatsappJid;
  } else if (phone && phone.length >= 8) {
    conversation = await findWhatsAppConversationByPhone(phone);
    to = conversation?.externalId ?? `${phone}@s.whatsapp.net`;
  } else {
    return false; // contacto por email: no hay WhatsApp al que avisar
  }
  await socket.sendMessage(to, { text });
  if (conversation) {
    const messages = [...(conversation.messages as StoredMessage[]), message('assistant', text, { manual: true })];
    await updateConversation(conversation.id, { messages: messages.slice(-MAX_STORED_MESSAGES) }, null);
    notifyChange(slug, 'conversations');
  }
  return true;
}

/** Envía un texto a un chat concreto (JID guardado en la conversación). */
export async function sendToJid(slug: string, jid: string, text: string) {
  const socket = sessions.get(slug)?.socket;
  if (!socket || whatsappStatus(slug).status !== 'connected') throw new Error('WhatsApp no está conectado');
  await socket.sendMessage(jid, { text });
}

export async function sendWhatsAppMessage(slug: string, phone: string, text: string) {
  const socket = sessions.get(slug)?.socket;
  if (!socket || whatsappStatus(slug).status !== 'connected') throw new Error('WhatsApp no está conectado');
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) throw new Error('Número de WhatsApp inválido');
  await socket.sendMessage(`${digits}@s.whatsapp.net`, { text });
}

/** Texto del mensaje (texto normal, respuesta citada o pie de foto/vídeo). */
export function messageText(m: WAMessage): string | null {
  const msg = m.message;
  const text =
    msg?.conversation ?? msg?.extendedTextMessage?.text ?? msg?.imageMessage?.caption ?? msg?.videoMessage?.caption;
  return text?.trim() || null;
}

/** Teléfono (solo dígitos) del remitente; con LID se usa el JID alternativo si WhatsApp lo da. */
export function senderPhone(remoteJid: string, remoteJidAlt?: string | null): string | null {
  const jid = [remoteJidAlt, remoteJid].find((j) => j?.endsWith('@s.whatsapp.net'));
  return jid ? jid.split('@')[0].split(':')[0] : null;
}

const isPrivateChat = (jid: string) => !/@(g\.us|broadcast|newsletter)$/.test(jid);

// Una cola por chat: las respuestas a una misma persona salen en orden.
const queues = new Map<string, Promise<void>>();

function enqueue(key: string, task: () => Promise<void>) {
  const next = (queues.get(key) ?? Promise.resolve())
    .then(task)
    .catch((err) => console.error(`[whatsapp] No se pudo responder (${key}):`, err))
    .finally(() => {
      if (queues.get(key) === next) queues.delete(key);
    });
  queues.set(key, next);
}

// Quien escribe en varios mensajes seguidos recibe una sola respuesta: se espera a que pare de escribir.
const QUIET_MS = 5_000;
const MAX_WAIT_MS = 20_000;
type Piece = { slug: string; socket: WASocket; jid: string; text: string; phone: string | null; name?: string };

const batcher = createBatcher<Piece>(
  (key, pieces) => {
    const { slug, socket, jid } = pieces[pieces.length - 1];
    enqueue(key, async () => {
      await socket.sendPresenceUpdate('composing', jid).catch(() => undefined);
      let replies: string[];
      try {
        replies = await answerMessage(slug, {
          chatId: jid,
          phone: pieces.find((p) => p.phone)?.phone ?? null,
          name: pieces.find((p) => p.name)?.name,
          text: pieces.map((p) => p.text).join('\n'),
          parts: pieces.map((p) => p.text),
        });
      } catch (err) {
        console.error(`[whatsapp:${slug}] Error al responder a ${jid}:`, err);
        replies = [FALLBACK_REPLY];
      }
      await socket.sendPresenceUpdate('paused', jid).catch(() => undefined);
      for (const text of replies) await socket.sendMessage(jid, { text });
    });
  },
  { quietMs: QUIET_MS, maxWaitMs: MAX_WAIT_MS }
);

function handleIncoming(slug: string, socket: WASocket, m: WAMessage) {
  const jid = m.key.remoteJid;
  if (!jid || m.key.fromMe || !isPrivateChat(jid) || !m.message) return;
  if (m.message.protocolMessage || m.message.reactionMessage) return; // avisos internos y reacciones

  const key = `${slug}|${jid}`;
  void socket.readMessages([m.key]).catch(() => undefined);
  const text = messageText(m);
  if (!text) {
    enqueue(key, async () => {
      await socket.sendMessage(jid, { text: ONLY_TEXT_REPLY });
    });
    return;
  }
  void socket.sendPresenceUpdate('composing', jid).catch(() => undefined);
  batcher.push(key, {
    slug,
    socket,
    jid,
    text,
    phone: senderPhone(jid, m.key.remoteJidAlt),
    name: m.pushName ?? undefined,
  });
}

/** Al arrancar el servidor, reconecta los negocios que ya tenían WhatsApp vinculado. */
export async function restoreWhatsAppSessions() {
  if (!existsSync(AUTH_ROOT)) return;
  for (const slug of await readdir(AUTH_ROOT)) {
    if (!existsSync(path.join(AUTH_ROOT, slug, 'creds.json'))) continue;
    if (!(await findActiveTenant(slug))) continue;
    console.log(`[whatsapp:${slug}] Reconectando sesión guardada…`);
    await connectWhatsApp(slug).catch((err) => console.error(`[whatsapp:${slug}] No se pudo reconectar:`, err));
  }
}
