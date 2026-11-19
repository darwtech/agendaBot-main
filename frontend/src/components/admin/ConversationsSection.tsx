import * as React from 'react';
import { CheckCheck, MessageSquareText, Search, Send, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { isApiMode, refreshConversations, replyOnWhatsApp } from '../../lib/api/sync';
import { useAppStore } from '../../store/useAppStore';
import { Button, Input } from '../ui';
import { cn } from '../ui/utils';

const time = (value: string) => new Intl.DateTimeFormat('es-EC', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
const initials = (name?: string) => (name ?? 'V').split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase();

/** Bandeja de atención manual con una experiencia similar a WhatsApp. */
export function ConversationsSection() {
  const conversations = useAppStore((s) => s.conversations);
  const appendMessage = useAppStore((s) => s.appendMessage);
  const [selectedId, setSelectedId] = React.useState<string | null>(conversations[0]?.id ?? null);
  const [query, setQuery] = React.useState('');
  const [reply, setReply] = React.useState('');
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? conversations[0] ?? null;
  const filtered = conversations.filter((conversation) => {
    const text = `${conversation.customerName ?? ''} ${conversation.messages.at(-1)?.content ?? ''}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  });

  React.useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }); }, [selected?.id, selected?.messages.length]);

  // Los chats de WhatsApp los escribe el servidor: se recargan cada pocos segundos mientras esta pantalla está abierta.
  React.useEffect(() => {
    if (!isApiMode) return;
    const load = () => void refreshConversations().catch(() => undefined);
    load();
    const timer = window.setInterval(load, 30_000); // respaldo: lo normal es el aviso en tiempo real
    return () => window.clearInterval(timer);
  }, []);

  const [sending, setSending] = React.useState(false);
  const sendReply = async () => {
    const content = reply.trim();
    if (!selected || !content || sending) return;
    if (isApiMode && selected.channel === 'whatsapp') {
      setSending(true);
      try {
        await replyOnWhatsApp(selected.id, content);
        setReply('');
        toast.success('Mensaje enviado por WhatsApp.');
      } catch (err) {
        toast.error(`No se pudo enviar: ${(err as Error).message}`);
      } finally {
        setSending(false);
      }
      return;
    }
    appendMessage(selected.id, { id: `msg-admin-${Date.now()}`, role: 'assistant', content, timestamp: new Date().toISOString(), intent: 'OTHER' });
    setReply('');
    toast.success('Respuesta enviada a la conversación.');
  };

  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:h-[calc(100dvh-8.5rem)] lg:min-h-[600px]">
    <div className="grid h-full min-h-0 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <aside className={cn('min-h-0 border-b border-slate-200 dark:border-slate-800 lg:flex lg:flex-col lg:border-r lg:border-b-0', selected && 'hidden lg:flex')}>
        <div className="bg-[var(--accent-700)] px-4 py-4 text-white"><div className="flex items-center gap-2"><MessageSquareText className="h-5 w-5" aria-hidden="true" /><h2 className="font-display font-semibold">Mensajes</h2><span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 text-xs">{conversations.length}</span></div><div className="relative mt-3"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente o mensaje…" className="h-9 border-0 bg-white pl-9 text-xs text-slate-900" /></div></div>
        <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800 lg:max-h-none lg:flex-1">
          {filtered.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">No hay coincidencias.</p> : filtered.map((conversation) => {
            const active = conversation.id === selected?.id;
            const last = conversation.messages.at(-1);
            return <button key={conversation.id} type="button" onClick={() => setSelectedId(conversation.id)} className={cn('flex w-full gap-3 px-4 py-3 text-left transition-colors', active ? 'bg-[var(--accent-50)] dark:bg-[var(--accent-700)]/15' : 'hover:bg-slate-50 dark:hover:bg-slate-800')}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-200">{initials(conversation.customerName)}</span><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{conversation.customerName || 'Visitante anónimo'}</span>{conversation.channel === 'whatsapp' && <Smartphone className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-label="WhatsApp" />}</span><span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{last?.content ?? 'Sin mensajes'}</span></span><span className="shrink-0 font-mono text-[10px] text-slate-400">{last ? time(last.timestamp) : ''}</span></button>;
          })}
        </div>
      </aside>

      <section className={cn('flex min-h-0 flex-col', !selected && 'hidden lg:flex')}>
        {!selected ? <div className="m-auto text-center"><MessageSquareText className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-sm text-slate-500">Selecciona una conversación.</p></div> : <>
          <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800"><button type="button" onClick={() => setSelectedId(null)} className="text-sm font-medium text-[var(--accent-700)] lg:hidden">Volver</button><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-100)] text-xs font-bold text-[var(--accent-700)]">{initials(selected.customerName)}</span><div className="min-w-0"><h2 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{selected.customerName || 'Visitante anónimo'}</h2><p className="text-xs text-slate-500">{selected.channel === 'whatsapp' ? 'WhatsApp · Responde la IA (puedes escribir tú también)' : 'Chat web'}</p></div></header>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-stone-50/80 px-4 py-5 dark:bg-slate-950/40 sm:px-6">
            {selected.messages.map((message) => { const outgoing = message.role === 'assistant'; return <div key={message.id} className={cn('flex', outgoing ? 'justify-end' : 'justify-start')}><div className={cn('max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm sm:max-w-[70%]', outgoing ? 'rounded-br-sm bg-[var(--accent-600)] text-white' : message.role === 'error' ? 'rounded-bl-sm bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100' : 'rounded-bl-sm bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100')}><p className="whitespace-pre-wrap break-words">{message.content}</p><span className={cn('mt-1 flex items-center justify-end gap-1 text-[10px]', outgoing ? 'text-white/75' : 'text-slate-400')}><time>{time(message.timestamp)}</time>{outgoing && <CheckCheck className="h-3 w-3" aria-label="Enviado" />}</span></div></div>; })}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void sendReply(); }} className="shrink-0 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-end gap-2"><textarea value={reply} onChange={(event) => setReply(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendReply(); } }} placeholder="Escribe una respuesta…" rows={1} className="min-h-11 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[var(--accent-500)] focus:ring-2 focus:ring-[var(--accent-100)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /><Button type="submit" size="icon" aria-label="Enviar respuesta" disabled={!reply.trim() || sending}><Send className="h-4 w-4" aria-hidden="true" /></Button></div><p className="mt-1.5 text-[11px] text-slate-400">Enter para enviar · Shift + Enter para nueva línea</p></form>
        </>}
      </section>
    </div>
  </div>;
}
