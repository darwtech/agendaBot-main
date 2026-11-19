import { z } from 'zod';

// Mensajes y borrador se guardan tal cual en `context` (jsonb); solo se limita su tamaño.
const message = z.looseObject({
  id: z.string().max(100),
  role: z.enum(['user', 'assistant', 'error']),
  content: z.string().max(5_000),
  timestamp: z.string().max(40),
});

const context = {
  customerName: z.string().trim().max(100).optional(),
  messages: z.array(message).max(500),
  draft: z.record(z.string(), z.unknown()),
};

export const conversationCreateSchema = z.object({
  id: z.uuid(),
  channel: z.enum(['web', 'whatsapp']).default('web'),
  ...context,
});

export const conversationPatchSchema = z.object(context).partial();

export type ConversationCreate = z.infer<typeof conversationCreateSchema>;
export type ConversationPatch = z.infer<typeof conversationPatchSchema>;
