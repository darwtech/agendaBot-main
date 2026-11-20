/**
 * HopperSoft — Creador: Darwin Chavez
 */
import type { StateCreator } from 'zustand';
import { createEmptyDraft } from './seed';
import type {
  BookingDraft,
  ChannelType,
  ChatMessageItem,
  Conversation,
} from './types';

export interface ConversationsSlice {
  conversations: Conversation[];
  activeConversationId: string;
  startNewConversation: (channel?: ChannelType) => string;
  setActiveConversation: (id: string) => void;
  appendMessage: (conversationId: string, message: ChatMessageItem) => void;
  updateConversationDraft: (
    conversationId: string,
    draft: BookingDraft,
    customerName?: string
  ) => void;
}

export const createConversationsSlice: StateCreator<
  ConversationsSlice,
  [],
  [],
  ConversationsSlice
> = (set) => ({
  conversations: [],
  activeConversationId: 'conv-welcome',
  startNewConversation: (channel = 'web') => {
    const nowIso = new Date().toISOString();
    const id = crypto.randomUUID();
    const newConv: Conversation = {
      id,
      channel,
      createdAt: nowIso,
      updatedAt: nowIso,
      draft: createEmptyDraft(),
      messages: [
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content:
            '¡Hola! Empezamos una conversación nueva. ¿Qué servicio te gustaría reservar o qué horario quieres consultar?',
          timestamp: nowIso,
          intent: 'OTHER',
        },
      ],
    };
    set((state) => ({
      conversations: [newConv, ...state.conversations],
      activeConversationId: id,
    }));
    return id;
  },
  setActiveConversation: (id) => set({ activeConversationId: id }),
  appendMessage: (conversationId, message) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              updatedAt: message.timestamp,
              messages: [...conv.messages, message],
            }
          : conv
      ),
    })),
  updateConversationDraft: (conversationId, draft, customerName) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              customerName: customerName ?? conv.customerName ?? draft.fullName ?? undefined,
              draft,
              updatedAt: new Date().toISOString(),
            }
          : conv
      ),
    })),
});
