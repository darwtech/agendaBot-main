import { AlertCircle } from 'lucide-react';
import type { ChatMessageItem } from '../../store/types';
import { cn } from '../ui/utils';

interface ChatMessageProps {
  message: ChatMessageItem;
  onQuickSelect?: (text: string) => void;
  disabled?: boolean;
}

function formatMessageTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

export function ChatMessage({
  message,
  onQuickSelect,
  disabled,
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isError = message.role === 'error';

  return (
    <div
      className={cn(
        'flex w-full flex-col gap-1.5',
        isUser ? 'items-end' : 'items-start'
      )}
    >
      <div
        className={cn(
          'max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap break-words',
          isUser &&
            'rounded-br-sm bg-emerald-100 text-emerald-950 border border-emerald-200/80 dark:bg-emerald-950/75 dark:text-emerald-50 dark:border-emerald-800/70',
          !isUser &&
            !isError &&
            'rounded-bl-sm bg-white text-slate-900 border border-slate-200/90 shadow-2xs dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800',
          isError &&
            'rounded-bl-sm bg-red-50 text-red-900 border border-red-200 dark:bg-red-950/60 dark:text-red-100 dark:border-red-900/70'
        )}
      >
        {isError && (
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-300">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Error del proveedor</span>
          </div>
        )}
        <p>{message.content}</p>
      </div>

      {!isUser &&
        !isError &&
        message.suggestedSlots &&
        message.suggestedSlots.length > 0 &&
        onQuickSelect && (
          <div
            className="flex max-w-[85%] flex-wrap gap-1.5 pt-0.5"
            aria-label="Horarios disponibles"
          >
            {message.suggestedSlots.map((slot) => (
              <button
                key={slot}
                type="button"
                disabled={disabled}
                onClick={() => onQuickSelect(`A las ${slot}`)}
                className="min-h-[38px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs font-medium tabular-nums text-slate-800 transition-colors hover:border-[var(--accent-500)] hover:bg-[var(--accent-50)] hover:text-[var(--accent-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-500)] disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-[var(--accent-500)] dark:hover:bg-slate-800 cursor-pointer"
              >
                {slot}
              </button>
            ))}
          </div>
        )}

      {!isUser && !isError && message.isConfirmationPrompt && onQuickSelect && (
        <div className="flex flex-wrap gap-2 pt-0.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onQuickSelect('Sí')}
            className="min-h-[40px] rounded-lg bg-[var(--accent-600)] px-3.5 py-1.5 text-xs font-medium text-[var(--accent-fg)] transition-colors hover:bg-[var(--accent-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-500)] disabled:opacity-50 cursor-pointer"
          >
            Sí, confirmar cita
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onQuickSelect('No')}
            className="min-h-[40px] rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-500)] disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
          >
            No, cancelar
          </button>
        </div>
      )}

      <span className="px-1 font-mono text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
        {formatMessageTime(message.timestamp)}
      </span>
    </div>
  );
}
