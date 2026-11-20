/**
 * HopperSoft — Creador: Darwin Chavez
 */
import * as React from 'react';
import { Gauge } from 'lucide-react';
import { api } from '../../lib/api/client';
import { isApiMode } from '../../lib/api/sync';
import { Card } from '../ui';
import { cn } from '../ui/utils';

interface AIUsage {
  provider: string;
  model: string;
  requestsToday: number;
  tokensToday: number;
  dailyTokenLimit: number | null;
  requests: { limit: number; remaining: number; resetIn: string | null } | null;
  tokensPerMinute: { limit: number; remaining: number } | null;
  lastLimitError: string | null;
  updatedAt: string | null;
}

// Tokens medios por respuesta mientras no hay datos de hoy (prompt con servicios, horario y huecos).
const DEFAULT_TOKENS_PER_REPLY = 2_000;
const nf = new Intl.NumberFormat('es-EC');

/** "43m12s" / "577ms" / "1h2m3s" → "43 min" / "unos segundos" / "1 h 2 min" */
function humanReset(value: string | null): string | null {
  if (!value) return null;
  const h = Number(/(\d+)h/.exec(value)?.[1] ?? 0);
  const m = Number(/(\d+)m(?!s)/.exec(value)?.[1] ?? 0);
  if (!h && !m) return 'unos segundos';
  return [h ? `${h} h` : '', m ? `${m} min` : ''].filter(Boolean).join(' ');
}

function Bar({ label, used, limit, detail }: { label: string; used: number; limit: number; detail?: string }) {
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const tone = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-[var(--accent-600)]';
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-slate-800 dark:text-slate-200">{label}</span>
        <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
          {nf.format(used)} / {nf.format(limit)} · {pct}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
        className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
      >
        <div className={cn('h-full rounded-full transition-[width] duration-500', tone)} style={{ width: `${pct}%` }} />
      </div>
      {detail && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>}
    </div>
  );
}

/** Barra de consumo del plan gratuito de la IA que responde WhatsApp. */
export function AIUsageCard({ className }: { className?: string }) {
  const [usage, setUsage] = React.useState<AIUsage | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isApiMode) return;
    const load = () =>
      api
        .get<AIUsage>('/assistant/usage')
        .then((u) => {
          setUsage(u);
          setError(null);
        })
        .catch((err: Error) => setError(err.message));
    void load();
    const timer = window.setInterval(load, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!isApiMode) return null;

  const tokenLimit = usage?.dailyTokenLimit ?? null;
  const tokensLeft = tokenLimit !== null && usage ? Math.max(0, tokenLimit - usage.tokensToday) : null;
  const perReply = usage && usage.requestsToday > 0 ? usage.tokensToday / usage.requestsToday : DEFAULT_TOKENS_PER_REPLY;
  const repliesLeft = tokensLeft !== null ? Math.floor(tokensLeft / Math.max(1, perReply)) : null;
  const reqUsed = usage?.requests ? usage.requests.limit - usage.requests.remaining : null;
  const nearLimit = tokenLimit !== null && usage ? usage.tokensToday / tokenLimit >= 0.9 : false;

  return (
    <Card as="section" className={cn('p-5', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-50)] text-[var(--accent-700)] dark:bg-[var(--accent-700)]/25 dark:text-[var(--accent-100)]">
            <Gauge className="h-4.5 w-4.5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Límite gratuito de la IA</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {usage ? `${usage.provider === 'groq' ? 'Groq' : usage.provider}${usage.model ? ` · ${usage.model}` : ''}` : 'Cargando…'}
            </p>
          </div>
        </div>
        {repliesLeft !== null && (
          <p className="text-right">
            <span className="block font-display text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              ≈ {nf.format(repliesLeft)}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">respuestas más hoy</span>
          </p>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">No se pudo leer el consumo: {error}</p>}

      {usage && (
        <div className="mt-5 space-y-4">
          {tokenLimit !== null && (
            <Bar
              label="Tokens de hoy"
              used={usage.tokensToday}
              limit={tokenLimit}
              detail={`Quedan ${nf.format(tokensLeft ?? 0)}. Cada respuesta gasta unos ${nf.format(Math.round(perReply))}. Se reinicia a medianoche UTC (19:00 en Ecuador).`}
            />
          )}
          {usage.requests && reqUsed !== null && (
            <Bar
              label="Mensajes de hoy"
              used={reqUsed}
              limit={usage.requests.limit}
              detail={
                humanReset(usage.requests.resetIn)
                  ? `Se va liberando poco a poco; el siguiente hueco en ${humanReset(usage.requests.resetIn)}.`
                  : undefined
              }
            />
          )}
          {usage.tokensPerMinute && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Por minuto: {nf.format(usage.tokensPerMinute.remaining)} de {nf.format(usage.tokensPerMinute.limit)} tokens libres
              (si se agotan, la IA espera unos segundos y reintenta).
            </p>
          )}
          {!usage.updatedAt && (
            <p className="text-xs text-slate-500 dark:text-slate-400">Aún no hay consumo registrado hoy.</p>
          )}
          {(nearLimit || usage.lastLimitError === 'TPD') && (
            <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              Estás cerca del límite diario (o ya lo alcanzaste). Cuando se agote, WhatsApp responderá "Ahora mismo no puedo
              responder" hasta que se reinicie. Para evitarlo, sube de plan en Groq o cambia AI_PROVIDER en backend/.env.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
