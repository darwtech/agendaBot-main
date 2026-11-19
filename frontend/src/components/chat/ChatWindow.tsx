import * as React from 'react';
import { RotateCcw } from 'lucide-react';
import { BusinessIcon } from '../BusinessIcon';
import type { ChatMessageItem } from '../../store/types';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { QuickReplies } from './QuickReplies';
import { TypingIndicator } from './TypingIndicator';

interface ChatWindowProps {
  businessName: string;
  providerBadge: string;
  messages: ChatMessageItem[];
  isTyping: boolean;
  quickSuggestions: string[];
  onSendMessage: (text: string) => void;
  onNewConversation: () => void;
  headerActions?: React.ReactNode;
}

export function ChatWindow({
  businessName,
  providerBadge,
  messages,
  isTyping,
  quickSuggestions,
  onSendMessage,
  onNewConversation,
  headerActions,
}: ChatWindowProps) {
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isTyping]);

  return (
    <section
      className="flex h-full flex-col overflow-hidden bg-stone-50 dark:bg-slate-950 lg:rounded-2xl lg:border lg:border-slate-200 lg:dark:border-slate-800 lg:shadow-xs"
      aria-label="Ventana de chat con el asistente"
    >
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg dark:bg-slate-800"
            aria-hidden="true"
          >
            <BusinessIcon className="h-5 w-5 text-[var(--accent-600)]" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100 sm:text-base">
              {businessName}
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>Asistente de citas</span>
              <span aria-hidden="true">·</span>
              <span className="truncate font-medium text-slate-600 dark:text-slate-300">
                {providerBadge}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onNewConversation}
            title="Nueva conversación"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-500)] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Nueva conversación</span>
            <span className="sm:hidden">Nueva</span>
          </button>
          {headerActions}
        </div>
      </header>

      {/* Scrollable message feed with aria-live */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onQuickSelect={onSendMessage}
            disabled={isTyping}
          />
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Footer: Quick Replies + Input */}
      <div className="shrink-0 border-t border-slate-200 bg-white/95 px-4 py-3 space-y-2.5 dark:border-slate-800 dark:bg-slate-900/95">
        <QuickReplies
          suggestions={quickSuggestions}
          onSelect={onSendMessage}
          disabled={isTyping}
        />
        <ChatInput onSend={onSendMessage} disabled={isTyping} />
      </div>
    </section>
  );
}
