import * as React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Moon, ShieldCheck, Sun } from 'lucide-react';
import { BusinessIcon } from '../components/BusinessIcon';
import { ChatWindow } from '../components/chat/ChatWindow';
import { formatProviderBadgeLabel } from '../lib/ai/registry';
import { DAY_NAMES_ES, formatCurrency } from '../lib/booking/timezone';
import { processChatTurn } from '../lib/chat/engine';
import { useAppStore } from '../store/useAppStore';

const DEFAULT_SUGGESTIONS = [
  'Ver servicios',
  '¿Hay hueco mañana?',
  'Reservar cita',
];

export function ClientChatPage() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const activeProviderId = useAppStore((s) => s.activeProviderId);
  const providers = useAppStore((s) => s.providers);
  const services = useAppStore((s) => s.services);
  const schedule = useAppStore((s) => s.schedule);
  const appointments = useAppStore((s) => s.appointments);
  const customers = useAppStore((s) => s.customers);
  const conversations = useAppStore((s) => s.conversations);
  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const startNewConversation = useAppStore((s) => s.startNewConversation);
  const appendMessage = useAppStore((s) => s.appendMessage);
  const updateConversationDraft = useAppStore(
    (s) => s.updateConversationDraft
  );
  const bookAppointment = useAppStore((s) => s.bookAppointment);

  const [isTyping, setIsTyping] = React.useState(false);

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) ?? conversations[0];

  const activeConfig = providers[activeProviderId];
  const providerBadge = formatProviderBadgeLabel(
    activeProviderId,
    activeConfig?.model
  );

  const handleNewConversation = () => {
    startNewConversation('web');
  };

  const handleToggleTheme = () => {
    const isDark = document.documentElement.classList.contains('dark');
    updateSettings({ theme: isDark ? 'light' : 'dark' });
  };

  const handleSendMessage = async (text: string) => {
    if (!activeConversation || isTyping) return;
    const convId = activeConversation.id;
    const nowIso = new Date().toISOString();

    appendMessage(convId, {
      id: `msg-u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: nowIso,
    });

    setIsTyping(true);
    try {
      const state = useAppStore.getState();
      const currentConv =
        state.conversations.find((c) => c.id === convId) ?? activeConversation;

      const result = await processChatTurn(
        {
          userMessage: text,
          history: currentConv.messages.slice(0, -1),
          draft: currentConv.draft,
          channel: 'web',
        },
        {
          settings: state.settings,
          activeProviderId: state.activeProviderId,
          providers: state.providers,
          services: state.services,
          schedule: state.schedule,
          appointments: state.appointments,
          customers: state.customers,
          onBookAppointment: bookAppointment,
        }
      );

      updateConversationDraft(
        convId,
        result.updatedDraft,
        result.updatedDraft.fullName ?? undefined
      );

      appendMessage(convId, {
        id: `msg-a-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        role: result.isError ? 'error' : 'assistant',
        content: result.reply,
        timestamp: new Date().toISOString(),
        intent: result.intent,
        parsedIntent: result.parsedIntent ?? undefined,
        rawJson: result.rawJson ?? undefined,
        latencyMs: result.latencyMs,
        providerLabel: providerBadge,
        suggestedSlots: result.suggestedSlots,
        isConfirmationPrompt: result.isConfirmationPrompt,
      });
    } finally {
      setIsTyping(false);
    }
  };

  const activeServices = services.filter((s) => s.active);
  const orderedDays: Array<0 | 1 | 2 | 3 | 4 | 5 | 6> = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div className="min-h-dvh bg-stone-100 dark:bg-slate-950 lg:py-6 lg:px-6">
      <div className="mx-auto flex h-dvh w-full max-w-6xl flex-col gap-6 lg:h-[calc(100dvh-3rem)] lg:flex-row">
        {/* Main Messaging Canvas */}
        <main className="h-full min-w-0 flex-1">
          <ChatWindow
            businessName={settings.businessName}
            providerBadge={providerBadge}
            messages={activeConversation?.messages ?? []}
            isTyping={isTyping}
            quickSuggestions={DEFAULT_SUGGESTIONS}
            onSendMessage={handleSendMessage}
            onNewConversation={handleNewConversation}
            headerActions={
              <>
                <button
                  type="button"
                  onClick={handleToggleTheme}
                  aria-label="Cambiar tema claro u oscuro"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-500)] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Sun className="hidden h-4 w-4 dark:block" aria-hidden="true" />
                  <Moon className="block h-4 w-4 dark:hidden" aria-hidden="true" />
                </button>
                <Link
                  to="/admin"
                  aria-label="Ir al panel administrativo"
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-500)] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              </>
            }
          />
        </main>

        {/* Desktop Salon Reference Sidebar */}
        <aside
          className="hidden lg:flex lg:w-84 lg:shrink-0 lg:flex-col lg:gap-4 lg:overflow-y-auto"
          aria-label="Información de servicios y horarios"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <BusinessIcon className="h-4 w-4 text-[var(--accent-600)]" />
              <h2>Servicios disponibles</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Precios y duraciones actualizados en tiempo real.
            </p>

            {activeServices.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                No hay servicios activos en este momento.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                {activeServices.map((srv) => (
                  <li key={srv.id} className="py-3 first:pt-0 last:pb-0">
                    <button
                      type="button"
                      disabled={isTyping}
                      onClick={() => handleSendMessage(`Quiero reservar ${srv.name}`)}
                      className="flex w-full items-start justify-between gap-3 text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-500)] rounded-lg"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 group-hover:text-[var(--accent-600)] dark:text-slate-100">
                          {srv.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {srv.description}
                        </p>
                      </div>
                      <div className="shrink-0 text-right font-mono text-xs tabular-nums">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(srv.price, settings.currency)}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400">
                          {srv.durationMinutes} min
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Clock className="h-4 w-4 text-[var(--accent-600)]" aria-hidden="true" />
              <h2>Horario del salón</h2>
            </div>
            <dl className="mt-3 space-y-2 text-xs">
              {orderedDays.map((dow) => {
                const day = schedule.find((d) => d.dayOfWeek === dow);
                const isClosed = !day || day.closed || day.blocks.length === 0;
                return (
                  <div
                    key={dow}
                    className="flex items-baseline justify-between gap-2"
                  >
                    <dt className="font-medium text-slate-700 dark:text-slate-300">
                      {DAY_NAMES_ES[dow]}
                    </dt>
                    <dd className="font-mono tabular-nums text-slate-500 dark:text-slate-400 text-right">
                      {isClosed
                        ? 'Cerrado'
                        : day.blocks.map((b) => `${b.start}–${b.end}`).join(' · ')}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
