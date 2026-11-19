import { Router } from 'express';
import { actorOf, requireAdmin } from '../../shared/auth.js';
import { notFound, parse, uuidParam } from '../../shared/http.js';
import * as repo from './conversations.repository.js';
import { conversationCreateSchema, conversationPatchSchema } from './conversations.schema.js';

export const conversationsRouter = Router();

conversationsRouter.get('/', requireAdmin, async (_req, res) => {
  res.json(await repo.listConversations());
});

conversationsRouter.get('/:id', requireAdmin, async (req, res) => {
  const conversation = await repo.findConversation(parse(uuidParam, req.params.id));
  if (!conversation) throw notFound('Conversación');
  res.json(conversation);
});

// Público: el chat crea y actualiza su propia conversación.
// shortcut: el UUID aleatorio actúa como llave de la conversación; si hace falta más, firmar un token por conversación.
conversationsRouter.post('/', async (req, res) => {
  const data = parse(conversationCreateSchema, req.body);
  res.status(201).json(await repo.createConversation(data, actorOf(req)));
});

conversationsRouter.patch('/:id', async (req, res) => {
  const id = parse(uuidParam, req.params.id);
  const conversation = await repo.updateConversation(id, parse(conversationPatchSchema, req.body), actorOf(req));
  if (!conversation) throw notFound('Conversación');
  res.json(conversation);
});

conversationsRouter.delete('/:id', requireAdmin, async (req, res) => {
  if (!(await repo.softDeleteConversation(parse(uuidParam, req.params.id), actorOf(req)))) {
    throw notFound('Conversación');
  }
  res.status(204).end();
});
