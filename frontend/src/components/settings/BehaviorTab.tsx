/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { Label, Card } from '@/components/ui';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/button';
import { Input, Textarea } from '../ui/input';

export function BehaviorTab() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const resetSystemPrompt = useAppStore((s) => s.resetSystemPrompt);

  const insertVariable = (token: string) => {
    updateSettings({
      systemPrompt: `${settings.systemPrompt}${
        settings.systemPrompt.endsWith(' ') || settings.systemPrompt.endsWith('\n')
          ? ''
          : ' '
      }${token}`,
    });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <Card as="section" className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Prompt de sistema
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Define cómo el modelo extrae el JSON de intención sin inventar horarios.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              resetSystemPrompt();
              toast.success('Prompt restaurado por defecto.');
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Restaurar por defecto
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            Variables disponibles:
          </span>
          {['{{negocio}}', '{{hoy}}', '{{servicios}}'].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => insertVariable(v)}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            >
              {v}
            </button>
          ))}
        </div>

        <Textarea
          aria-label="Prompt de sistema"
          rows={11}
          value={settings.systemPrompt}
          onChange={(e) => updateSettings({ systemPrompt: e.target.value })}
          className="font-mono text-xs leading-relaxed"
        />
      </Card>

      <Card as="section" className="p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Límites y tiempos de respuesta
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="timeout-sec" size="xs">
              Tiempo de espera (s)
            </Label>
            <Input
              id="timeout-sec"
              type="number"
              min={5}
              max={60}
              value={settings.timeoutSeconds}
              onChange={(e) =>
                updateSettings({
                  timeoutSeconds: Math.max(5, Math.min(60, Number(e.target.value) || 15)),
                })
              }
              className="mt-1 font-mono"
            />
          </div>

          <div>
            <Label htmlFor="history-turns" size="xs">
              Turnos de historial
            </Label>
            <Input
              id="history-turns"
              type="number"
              min={1}
              max={20}
              value={settings.historyTurns}
              onChange={(e) =>
                updateSettings({
                  historyTurns: Math.max(1, Math.min(20, Number(e.target.value) || 6)),
                })
              }
              className="mt-1 font-mono"
            />
          </div>

          <div>
            <Label htmlFor="max-slots" size="xs">
              Huecos máximos mostrados
            </Label>
            <Input
              id="max-slots"
              type="number"
              min={2}
              max={16}
              value={settings.maxSlotsShown}
              onChange={(e) =>
                updateSettings({
                  maxSlotsShown: Math.max(2, Math.min(16, Number(e.target.value) || 6)),
                })
              }
              className="mt-1 font-mono"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
