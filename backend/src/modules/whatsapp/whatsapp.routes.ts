/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { Router } from 'express';
import { z } from 'zod';
import { actorOf, requireAdmin } from '../../shared/auth.js';
import { HttpError, notFound, parse, uuidParam } from '../../shared/http.js';
import { MAX_STORED_MESSAGES, message, type StoredMessage } from '../assistant/assistant.service.js';
import { findConversation, findExternalId, updateConversation } from '../conversations/conversations.repository.js';
import { connectWhatsApp, disconnectWhatsApp, sendToJid, sendWhatsAppMessage, whatsappStatus } from './whatsapp.service.js';

export const whatsappRouter = Router();
whatsappRouter.get('/status', requireAdmin, (req, res) => res.json(whatsappStatus(req.tenant!.slug)));
whatsappRouter.post('/connect', requireAdmin, async (req, res) => res.json(await connectWhatsApp(req.tenant!.slug)));
whatsappRouter.post('/disconnect', requireAdmin, async (req, res) => { await disconnectWhatsApp(req.tenant!.slug); res.status(204).end(); });
whatsappRouter.post('/send', requireAdmin, async (req, res) => {
  const { phone, text } = parse(z.object({ phone: z.string().min(8).max(40), text: z.string().trim().min(1).max(4_000) }), req.body);
  try { await sendWhatsAppMessage(req.tenant!.slug, phone, text); res.status(204).end(); }
  catch (error) { throw new HttpError(409, error instanceof Error ? error.message : 'No se pudo enviar el mensaje'); }
});

// Respuesta manual desde el panel a un chat de WhatsApp: se envía y, si sale, se guarda en la conversación.
whatsappRouter.post('/conversations/:id/reply', requireAdmin, async (req, res) => {
  const id = parse(uuidParam, req.params.id);
  const { text } = parse(z.object({ text: z.string().trim().min(1).max(4_000) }), req.body);
  const [ref, conversation] = await Promise.all([findExternalId(id), findConversation(id)]);
  if (!ref || !conversation) throw notFound('Conversación');
  if (ref.channel !== 'whatsapp') throw new HttpError(400, 'Esta conversación no es de WhatsApp');
  try {
    await sendToJid(req.tenant!.slug, ref.externalId, text);
  } catch (error) {
    throw new HttpError(409, error instanceof Error ? error.message : 'No se pudo enviar el mensaje');
  }
  const messages = [...(conversation.messages as StoredMessage[]), message('assistant', text, { manual: true })];
  res.json(await updateConversation(id, { messages: messages.slice(-MAX_STORED_MESSAGES) }, actorOf(req)));
});
