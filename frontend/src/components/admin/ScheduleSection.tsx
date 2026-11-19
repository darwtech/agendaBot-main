import { Label, Card } from '@/components/ui';
import * as React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAvailableSlots } from '../../lib/booking';
import {
  DAY_NAMES_ES,
  formatDateEs,
  getNowPartsInTimezone,
} from '../../lib/booking/timezone';
import { useAppStore } from '../../store/useAppStore';
import type { DaySchedule } from '../../store/types';
import { Button } from '../ui/button';
import { Input, Select } from '../ui/input';
import { Switch } from '../ui/switch';

const ORDERED_DAYS: Array<DaySchedule['dayOfWeek']> = [1, 2, 3, 4, 5, 6, 0];

export function ScheduleSection() {
  const schedule = useAppStore((s) => s.schedule);
  const services = useAppStore((s) => s.services);
  const settings = useAppStore((s) => s.settings);
  const appointments = useAppStore((s) => s.appointments);
  const updateDaySchedule = useAppStore((s) => s.updateDaySchedule);
  const addScheduleBlock = useAppStore((s) => s.addScheduleBlock);
  const removeScheduleBlock = useAppStore((s) => s.removeScheduleBlock);

  const { dateStr: todayStr } = getNowPartsInTimezone(settings.timezone);
  const activeServices = services.filter((s) => s.active);

  const [previewDate, setPreviewDate] = React.useState(todayStr);
  const [previewServiceId, setPreviewServiceId] = React.useState(
    activeServices[0]?.id ?? ''
  );

  React.useEffect(() => {
    if (!previewServiceId && activeServices[0]) {
      setPreviewServiceId(activeServices[0].id);
    }
  }, [activeServices, previewServiceId]);

  const previewSlots = React.useMemo(() => {
    if (!previewDate || !previewServiceId) return [];
    return getAvailableSlots(previewDate, previewServiceId);
  }, [previewDate, previewServiceId, schedule, services, appointments, settings.slotInterval, settings.timezone]);

  const handleBlockChange = (
    dow: DaySchedule['dayOfWeek'],
    blockIdx: number,
    field: 'start' | 'end',
    value: string
  ) => {
    const day = schedule.find((d) => d.dayOfWeek === dow);
    if (!day) return;
    const nextBlocks = day.blocks.map((b, idx) =>
      idx === blockIdx ? { ...b, [field]: value } : b
    );
    updateDaySchedule(dow, { blocks: nextBlocks });
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Weekly Split-Shift Editor */}
      <Card as="section" className="divide-y divide-slate-100 lg:col-span-8 dark:divide-slate-800">
        {ORDERED_DAYS.map((dow) => {
          const day = schedule.find((d) => d.dayOfWeek === dow) ?? {
            dayOfWeek: dow,
            closed: true,
            blocks: [],
          };

          return (
            <div key={dow} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={!day.closed}
                    onCheckedChange={(open) => {
                      updateDaySchedule(dow, {
                        closed: !open,
                        blocks:
                          open && day.blocks.length === 0
                            ? [{ start: '10:00', end: '14:00' }]
                            : day.blocks,
                      });
                      toast.success(
                        `${DAY_NAMES_ES[dow]}: ${open ? 'abierto' : 'cerrado'}`
                      );
                    }}
                    label={`Abrir o cerrar ${DAY_NAMES_ES[dow]}`}
                  />
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {DAY_NAMES_ES[dow]}
                  </h2>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {day.closed ? 'Cerrado' : `${day.blocks.length} tramo(s)`}
                  </span>
                </div>

                {!day.closed && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      addScheduleBlock(dow, { start: '16:00', end: '20:00' })
                    }
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Añadir tramo
                  </Button>
                )}
              </div>

              {!day.closed && (
                <div className="mt-3 space-y-2.5">
                  {day.blocks.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Sin tramos horarios. Añade al menos uno para generar huecos.
                    </p>
                  ) : (
                    day.blocks.map((block, idx) => (
                      <div
                        key={idx}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <Input
                          type="time"
                          aria-label={`Inicio tramo ${idx + 1} del ${DAY_NAMES_ES[dow]}`}
                          value={block.start}
                          onChange={(e) =>
                            handleBlockChange(dow, idx, 'start', e.target.value)
                          }
                          className="w-32 font-mono"
                        />
                        <span className="text-xs text-slate-400">a</span>
                        <Input
                          type="time"
                          aria-label={`Fin tramo ${idx + 1} del ${DAY_NAMES_ES[dow]}`}
                          value={block.end}
                          onChange={(e) =>
                            handleBlockChange(dow, idx, 'end', e.target.value)
                          }
                          className="w-32 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => removeScheduleBlock(dow, idx)}
                          aria-label={`Eliminar tramo ${idx + 1} del ${DAY_NAMES_ES[dow]}`}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </Card>

      {/* Live Slot Preview */}
      <Card as="aside" className="p-5 lg:col-span-4 self-start">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Vista previa de huecos
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Comprueba los turnos disponibles cada {settings.slotInterval} min según el horario y las citas confirmadas.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="preview-date" size="xs">
              Fecha
            </Label>
            <Input
              id="preview-date"
              type="date"
              value={previewDate}
              onChange={(e) => setPreviewDate(e.target.value)}
              className="mt-1 font-mono"
            />
          </div>

          <div>
            <Label htmlFor="preview-service" size="xs">
              Servicio
            </Label>
            <Select
              id="preview-service"
              value={previewServiceId}
              onChange={(e) => setPreviewServiceId(e.target.value)}
              className="mt-1"
            >
              {activeServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.durationMinutes} min)
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
          <p className="text-xs font-medium capitalize text-slate-700 dark:text-slate-300">
            {formatDateEs(previewDate)}
          </p>

          {previewSlots.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              No hay huecos libres para este día.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {previewSlots.map((slot) => (
                <span
                  key={slot}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs tabular-nums text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                >
                  {slot}
                </span>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
