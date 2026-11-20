/**
 * HopperSoft — Creador: Darwin Chavez
 */
import * as React from 'react';
import { CheckCircle2, Info, Loader2, QrCode, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api/client';
import { Card, Button } from '../ui';
import { AIUsageCard } from './AIUsageCard';

type WhatsAppState = { status: 'disconnected' | 'connecting' | 'qr' | 'connected'; qrDataUrl?: string; phone?: string; error?: string };

/** Vincula un número real de WhatsApp mediante Baileys y Dispositivos vinculados. */
export function WhatsAppSection() {
  const [state, setState] = React.useState<WhatsAppState>({ status: 'disconnected' });
  const [loading, setLoading] = React.useState(false);
  const [checkedAt, setCheckedAt] = React.useState<Date | null>(null);
  const refresh = React.useCallback(async () => { try { setState(await api.get<WhatsAppState>('/whatsapp/status')); setCheckedAt(new Date()); } catch { /* se muestra el estado actual */ } }, []);
  React.useEffect(() => { void refresh(); }, [refresh]);
  React.useEffect(() => { if (state.status !== 'connecting' && state.status !== 'qr') return; const timer = window.setInterval(() => void refresh(), 2_000); return () => window.clearInterval(timer); }, [state.status, refresh]);
  const connect = async () => { setLoading(true); try { setState(await api.post<WhatsAppState>('/whatsapp/connect')); toast.info('Generando código QR de WhatsApp…'); } catch (error) { toast.error(error instanceof Error ? error.message : 'No se pudo iniciar la conexión'); } finally { setLoading(false); } };
  const disconnect = async () => { setLoading(true); try { await api.post('/whatsapp/disconnect'); setState({ status: 'disconnected' }); toast.info('WhatsApp desconectado.'); } finally { setLoading(false); } };

  const connected = state.status === 'connected';
  return <div className="max-w-2xl"><Card className="p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">WhatsApp</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Conecta tu cuenta para recibir y responder mensajes desde AgendaBot.</p></div><span className={connected ? 'inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300'}><span className={connected ? 'h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse' : 'h-2.5 w-2.5 rounded-full bg-slate-400'} />{connected ? 'Conectado ahora' : state.status === 'qr' ? 'Esperando escaneo' : 'Desconectado'}</span></div>
    {(state.status === 'qr' || state.status === 'connecting') && <div className="mt-6 flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">{state.qrDataUrl ? <img src={state.qrDataUrl} alt="Código QR para vincular WhatsApp" className="h-64 w-64 rounded-xl bg-white p-3" /> : <Loader2 className="h-9 w-9 animate-spin text-[var(--accent-600)]" />}<h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Escanea el código QR</h3><p className="mt-1 max-w-sm text-center text-xs text-slate-600 dark:text-slate-400">En WhatsApp, abre Ajustes → Dispositivos vinculados → Vincular un dispositivo y escanea este código.</p></div>}
    {connected && <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"><div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5" />La IA responde automáticamente</div><p className="mt-1 text-xs">{state.phone ? `Número conectado: +${state.phone}.` : 'La sesión está activa.'} Cada mensaje recibido lo contesta el asistente y puede reservar citas. Los chats aparecen en Conversaciones.</p></div>}
    <div className="mt-6 flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-slate-400">{checkedAt ? `Estado verificado a las ${checkedAt.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Comprobando estado…'}</span><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => void refresh()}>Actualizar estado</Button>{connected || state.status === 'qr' || state.status === 'connecting' ? <Button variant="outline" onClick={disconnect} disabled={loading}><Unplug className="h-4 w-4" />Desconectar</Button> : <Button onClick={connect} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}Conectar WhatsApp</Button>}</div></div>
    <div className="mt-5 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"><Info className="h-4 w-4 shrink-0" /><p>Baileys utiliza WhatsApp Web mediante Dispositivos vinculados. Úsalo únicamente con cuentas y contactos autorizados; evita envíos masivos.</p></div>
  </Card><AIUsageCard className="mt-6" /></div>;
}
