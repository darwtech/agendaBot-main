/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { Card } from '@/components/ui';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { BusinessIcon } from '../BusinessIcon';
import type { AccentColor, ThemeMode } from '../../store/types';
import { cn } from '../ui/utils';

const THEME_OPTIONS: Array<{
  id: ThemeMode;
  label: string;
  icon: typeof Sun;
}> = [
  { id: 'light', label: 'Claro', icon: Sun },
  { id: 'dark', label: 'Oscuro', icon: Moon },
  { id: 'system', label: 'Sistema', icon: Monitor },
];

const ACCENT_OPTIONS: Array<{
  id: AccentColor;
  label: string;
  swatch: string;
}> = [
  { id: 'emerald', label: 'Esmeralda', swatch: 'bg-emerald-600' },
  { id: 'blue', label: 'Azul', swatch: 'bg-blue-600' },
  { id: 'amber', label: 'Ámbar', swatch: 'bg-amber-600' },
  { id: 'rose', label: 'Rosa', swatch: 'bg-rose-600' },
  { id: 'slate', label: 'Pizarra', swatch: 'bg-slate-700' },
];

export function AppearanceTab() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Controls */}
      <Card as="section" className="p-6 space-y-6 lg:col-span-7">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Tema de color
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Elige entre tema claro, oscuro o seguir la preferencia de tu sistema.
          </p>

          <div className="mt-3 grid grid-cols-3 gap-3">
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = settings.theme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateSettings({ theme: opt.id })}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-500)]',
                    isSelected
                      ? 'border-[var(--accent-600)] bg-[var(--accent-50)] text-[var(--accent-700)] dark:bg-slate-800 dark:text-white'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/50'
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Color de acento
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Se aplica a botones principales, pestañas activas y controles del chat.
          </p>

          <div className="mt-3 flex flex-wrap gap-2.5">
            {ACCENT_OPTIONS.map((acc) => {
              const isSelected = settings.accentColor === acc.id;
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => updateSettings({ accentColor: acc.id })}
                  className={cn(
                    'inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-500)]',
                    isSelected
                      ? 'border-slate-900 bg-slate-100 text-slate-900 dark:border-white dark:bg-slate-800 dark:text-white'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/50'
                  )}
                >
                  <span
                    className={cn('h-3.5 w-3.5 rounded-full', acc.swatch)}
                    aria-hidden="true"
                  />
                  <span>{acc.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Live Chat Preview */}
      <Card as="section" className="p-5 lg:col-span-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Vista previa del chat
        </h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-stone-50 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2.5 border-b border-slate-200 bg-white px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-900">
            <BusinessIcon className="h-4 w-4 text-[var(--accent-600)]" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                {settings.businessName}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Asistente de citas · Modo demo
              </p>
            </div>
          </div>

          <div className="space-y-2.5 p-3.5 text-xs">
            <Card className="max-w-[85%] rounded-bl-sm px-3 py-2 text-slate-900 dark:text-slate-100">
              ¡Hola! ¿Qué servicio te gustaría reservar?
            </Card>
            <div className="ml-auto max-w-[85%] rounded-xl rounded-br-sm border border-emerald-200/80 bg-emerald-100 px-3 py-2 text-emerald-950 dark:border-emerald-800/70 dark:bg-emerald-950/75 dark:text-emerald-50">
              Quiero una cita mañana a las 11:00
            </div>
            <div className="pt-1 flex justify-end">
              <span className="inline-flex rounded-lg bg-[var(--accent-600)] px-3 py-1.5 text-[11px] font-medium text-[var(--accent-fg)]">
                Confirmar cita
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
