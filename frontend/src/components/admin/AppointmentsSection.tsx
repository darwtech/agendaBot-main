import { Label, Card } from '@/components/ui';
import * as React from 'react';
import {
  Calendar,
  Download,
  List,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { getAvailableSlots as getAvailableSlotsPure } from '../../lib/booking/slots';
import {
  deleteAppointmentOnServer,
  isApiMode,
  refreshAppointments,
  updateAppointmentOnServer,
} from '../../lib/api/sync';
import {
  addDaysToDateStr,
  formatCurrency,
  formatShortDateEs,
  getNowPartsInTimezone,
} from '../../lib/booking/timezone';
import { useAppStore } from '../../store/useAppStore';
import type { Appointment } from '../../store/types';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { Input, Select, Textarea } from '../ui/input';
import { cn } from '../ui/utils';

type ViewMode = 'table' | 'calendar';
type RangeFilter = 'all' | 'today' | 'week';
type StatusFilter = 'all' | 'confirmed' | 'cancelled';
type ChannelFilter = 'all' | 'web' | 'whatsapp';

export function AppointmentsSection() {
  const appointments = useAppStore((s) => s.appointments);
  const services = useAppStore((s) => s.services);
  const settings = useAppStore((s) => s.settings);
  const schedule = useAppStore((s) => s.schedule);
  const bookAppointment = useAppStore((s) => s.bookAppointment);

  const { dateStr: todayStr } = getNowPartsInTimezone(settings.timezone);

  const [viewMode, setViewMode] = React.useState<ViewMode>('table');
  const [rangeFilter, setRangeFilter] = React.useState<RangeFilter>('all');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');
  const [serviceFilter, setServiceFilter] = React.useState<string>('all');
  const [channelFilter, setChannelFilter] = React.useState<ChannelFilter>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  // New appointment drawer state
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const activeServices = services.filter((s) => s.active);
  const [formServiceId, setFormServiceId] = React.useState(
    activeServices[0]?.id ?? ''
  );
  const [formDate, setFormDate] = React.useState(todayStr);
  const [formTime, setFormTime] = React.useState('');
  const [formName, setFormName] = React.useState('');
  const [formContact, setFormContact] = React.useState('');
  const [formChannel, setFormChannel] = React.useState<'web' | 'whatsapp'>('web');
  const [formError, setFormError] = React.useState<string | null>(null);

  // Edición: el mismo panel lateral, con la cita que se edita
  const [editing, setEditing] = React.useState<Appointment | null>(null);
  const [formNotes, setFormNotes] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  // Cancelar (con motivo) y eliminar
  const [cancelTarget, setCancelTarget] = React.useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = React.useState('');
  const [deleteTarget, setDeleteTarget] = React.useState<Appointment | null>(null);

  // Las citas de WhatsApp las crea el servidor: se recargan mientras esta pantalla está abierta.
  React.useEffect(() => {
    if (!isApiMode) return;
    const load = () => void refreshAppointments().catch(() => undefined);
    const timer = window.setInterval(load, 30_000); // respaldo: lo normal es el aviso en tiempo real
    return () => window.clearInterval(timer);
  }, []);

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setFormDate(todayStr);
    setFormName('');
    setFormContact('');
    setFormNotes('');
    setDrawerOpen(true);
  };

  const openEdit = (apt: Appointment) => {
    setEditing(apt);
    setFormError(null);
    setFormServiceId(apt.serviceId);
    setFormDate(apt.date);
    setFormTime(apt.time);
    setFormName(apt.customerName);
    setFormContact(apt.customerContact);
    setFormChannel(apt.channel === 'whatsapp' ? 'whatsapp' : 'web');
    setFormNotes(apt.notes ?? '');
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
  };

  React.useEffect(() => {
    if (!formServiceId && activeServices[0]) {
      setFormServiceId(activeServices[0].id);
    }
  }, [activeServices, formServiceId]);

  const freeSlots = React.useMemo(() => {
    if (!formDate || !formServiceId) return [];
    // Al editar, la propia cita no ocupa su hueco.
    const slots = getAvailableSlotsPure(formDate, formServiceId, {
      services,
      schedule,
      appointments: editing ? appointments.filter((a) => a.id !== editing.id) : appointments,
      timezone: settings.timezone,
      slotInterval: settings.slotInterval,
    });
    if (editing && editing.date === formDate && editing.serviceId === formServiceId && !slots.includes(editing.time)) {
      return [editing.time, ...slots].sort();
    }
    return slots;
  }, [formDate, formServiceId, appointments, services, schedule, settings.slotInterval, settings.timezone, editing]);

  const notifiedToast = (notified: boolean | undefined, ok: string) => {
    if (notified === true) toast.success(`${ok} Se avisó al cliente por WhatsApp.`);
    else if (notified === false) toast.warning(`${ok} No se pudo avisar por WhatsApp (sin conexión o sin teléfono).`);
    else toast.success(ok);
  };

  React.useEffect(() => {
    if (freeSlots.length > 0 && !freeSlots.includes(formTime)) {
      setFormTime(freeSlots[0]);
    } else if (freeSlots.length === 0) {
      setFormTime('');
    }
  }, [freeSlots, formTime]);

  const filteredAppointments = React.useMemo(() => {
    const weekEnd = addDaysToDateStr(todayStr, 6);
    const q = searchQuery.trim().toLowerCase();

    return [...appointments]
      .filter((a) => {
        if (rangeFilter === 'today' && a.date !== todayStr) return false;
        if (rangeFilter === 'week' && (a.date < todayStr || a.date > weekEnd))
          return false;
        if (statusFilter !== 'all' && a.status !== statusFilter) return false;
        if (serviceFilter !== 'all' && a.serviceId !== serviceFilter) return false;
        if (channelFilter !== 'all' && a.channel !== channelFilter) return false;
        if (
          q &&
          !a.customerName.toLowerCase().includes(q) &&
          !a.customerContact.toLowerCase().includes(q) &&
          !a.serviceName.toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) =>
        a.date !== b.date
          ? a.date.localeCompare(b.date)
          : a.time.localeCompare(b.time)
      );
  }, [
    appointments,
    rangeFilter,
    statusFilter,
    serviceFilter,
    channelFilter,
    searchQuery,
    todayStr,
  ]);

  const handleEditSubmit = async () => {
    if (!editing) return;
    if (!formServiceId || !formDate || !formTime) {
      setFormError('Selecciona un servicio, una fecha y una hora libre.');
      return;
    }
    const patch = {
      ...(formServiceId !== editing.serviceId ? { serviceId: formServiceId } : {}),
      ...(formDate !== editing.date ? { date: formDate } : {}),
      ...(formTime !== editing.time ? { time: formTime } : {}),
      ...(formNotes.trim() !== (editing.notes ?? '') ? { notes: formNotes.trim() } : {}),
    };
    if (!Object.keys(patch).length) {
      closeDrawer();
      return;
    }
    if (!isApiMode) {
      const service = services.find((s) => s.id === formServiceId);
      useAppStore.setState((st) => ({
        appointments: st.appointments.map((a) =>
          a.id === editing.id
            ? {
                ...a,
                ...patch,
                serviceName: service?.name ?? a.serviceName,
                price: service?.price ?? a.price,
                durationMinutes: service?.durationMinutes ?? a.durationMinutes,
              }
            : a
        ),
      }));
      toast.success('Cita actualizada.');
      closeDrawer();
      return;
    }
    setSaving(true);
    try {
      const { notified } = await updateAppointmentOnServer(editing.id, patch);
      const moved = 'date' in patch || 'time' in patch || 'serviceId' in patch;
      notifiedToast(moved ? notified : undefined, 'Cita actualizada.');
      closeDrawer();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (editing) {
      void handleEditSubmit();
      return;
    }

    if (!formServiceId || !formDate || !formTime) {
      setFormError('Selecciona un servicio, una fecha y una hora libre.');
      return;
    }
    if (!formName.trim() || !formContact.trim()) {
      setFormError('Introduce el nombre y el contacto del cliente.');
      return;
    }

    const res = bookAppointment({
      serviceId: formServiceId,
      date: formDate,
      time: formTime,
      fullName: formName,
      contact: formContact,
      channel: formChannel,
    });

    if (!res.ok) {
      setFormError(res.message);
      return;
    }

    toast.success(`Cita creada para ${res.appointment.customerName} a las ${res.appointment.time}`);
    setFormName('');
    setFormContact('');
    setDrawerOpen(false);
  };

  const closeCancel = () => {
    setCancelTarget(null);
    setCancelReason('');
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    const reason = cancelReason.trim();
    if (reason.length < 3) {
      toast.error('Escribe el motivo de la cancelación: se le enviará al cliente.');
      return;
    }
    setSaving(true);
    try {
      if (isApiMode) {
        const { notified } = await updateAppointmentOnServer(cancelTarget.id, { status: 'cancelled', cancelReason: reason });
        notifiedToast(notified, 'Cita cancelada.');
      } else {
        useAppStore.setState((st) => ({
          appointments: st.appointments.map((a) =>
            a.id === cancelTarget.id
              ? { ...a, status: 'cancelled', cancelReason: reason, cancelledAt: new Date().toISOString() }
              : a
          ),
        }));
        toast.success('Cita cancelada.');
      }
      closeCancel();
    } catch (err) {
      toast.error(`No se pudo cancelar: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      if (isApiMode) await deleteAppointmentOnServer(deleteTarget.id);
      else useAppStore.setState((st) => ({ appointments: st.appointments.filter((a) => a.id !== deleteTarget.id) }));
      toast.success('Cita eliminada.');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(`No se pudo eliminar: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDaysToDateStr(todayStr, i)
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors cursor-pointer',
              viewMode === 'table'
                ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            )}
          >
            <List className="h-3.5 w-3.5" aria-hidden="true" />
            Tabla
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors cursor-pointer',
              viewMode === 'calendar'
                ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            )}
          >
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            Semana
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Nueva cita
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar cliente o contacto…"
            aria-label="Buscar citas"
            className="pl-9"
          />
        </div>

        <Select
          value={rangeFilter}
          onChange={(e) => setRangeFilter(e.target.value as RangeFilter)}
          aria-label="Filtrar por rango de fechas"
        >
          <option value="all">Todas las fechas</option>
          <option value="today">Solo hoy</option>
          <option value="week">Próximos 7 días</option>
        </Select>

        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          aria-label="Filtrar por estado"
        >
          <option value="all">Todos los estados</option>
          <option value="confirmed">Confirmadas</option>
          <option value="cancelled">Canceladas</option>
        </Select>

        <Select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          aria-label="Filtrar por servicio"
        >
          <option value="all">Todos los servicios</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>

        <Select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value as ChannelFilter)}
          aria-label="Filtrar por canal"
        >
          <option value="all">Todos los canales</option>
          <option value="web">Chat web</option>
          <option value="whatsapp">WhatsApp</option>
        </Select>
      </Card>

      {/* Content View */}
      {viewMode === 'table' ? (
        <Card className="overflow-hidden">
          {filteredAppointments.length === 0 ? (
            <div className="py-12 text-center px-4">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                No hay citas que coincidan con los filtros
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Prueba ajustando el rango o crea una nueva cita manual.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Fecha y hora</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Servicio</th>
                    <th className="px-4 py-3 text-right">Importe</th>
                    <th className="px-4 py-3">Canal</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAppointments.map((apt) => (
                    <tr
                      key={apt.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3 font-mono text-xs tabular-nums whitespace-nowrap">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {apt.date}
                        </span>{' '}
                        <span className="text-slate-500 dark:text-slate-400">
                          {apt.time}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {apt.customerName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {apt.customerContact}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {apt.serviceName}{' '}
                        <span className="text-xs text-slate-400">
                          ({apt.durationMinutes} min)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        {formatCurrency(apt.price, settings.currency)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                        {apt.channel === 'whatsapp' ? 'WhatsApp' : 'Web'}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium whitespace-nowrap">
                        {apt.status === 'confirmed' ? (
                          <span className="text-emerald-700 dark:text-emerald-400">
                            Confirmada
                          </span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400" title={apt.cancelReason ?? undefined}>
                            Cancelada
                            {apt.cancelReason && (
                              <span className="mt-0.5 block max-w-[14rem] truncate font-normal text-slate-500 dark:text-slate-400">
                                {apt.cancelReason}
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(apt)} aria-label={`Editar cita de ${apt.customerName}`}>
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            Editar
                          </Button>
                          {apt.status === 'confirmed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCancelTarget(apt)}
                              className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/50"
                            >
                              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                              Cancelar
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(apt)}
                            aria-label={`Eliminar cita de ${apt.customerName}`}
                            className="h-9 w-9 text-slate-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/50"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        /* Weekly Calendar View */
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {weekDays.map((dayStr) => {
            const dayApts = filteredAppointments.filter((a) => a.date === dayStr);
            const isToday = dayStr === todayStr;
            return (
              <div
                key={dayStr}
                className={cn(
                  'flex flex-col rounded-xl border bg-white p-3 dark:bg-slate-900',
                  isToday
                    ? 'border-[var(--accent-500)]'
                    : 'border-slate-200 dark:border-slate-800'
                )}
              >
                <div className="border-b border-slate-100 pb-2 dark:border-slate-800">
                  <p className="text-xs font-semibold capitalize text-slate-900 dark:text-slate-100">
                    {formatShortDateEs(dayStr)}
                  </p>
                  <p className="font-mono text-[11px] tabular-nums text-slate-400">
                    {dayStr}
                  </p>
                </div>

                <div className="mt-2.5 flex-1 space-y-2">
                  {dayApts.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-400">
                      Sin citas
                    </p>
                  ) : (
                    dayApts.map((apt) => (
                      <div
                        key={apt.id}
                        className={cn(
                          'rounded-lg border p-2 text-xs',
                          apt.status === 'confirmed'
                            ? 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950'
                            : 'border-red-200/70 bg-red-50/50 opacity-70 dark:border-red-900/50 dark:bg-red-950/20'
                        )}
                      >
                        <div className="flex items-center justify-between font-mono font-semibold tabular-nums">
                          <span>{apt.time}</span>
                          <span>
                            {apt.status === 'confirmed' ? 'OK' : 'Canc.'}
                          </span>
                        </div>
                        <p className="mt-1 truncate font-medium text-slate-900 dark:text-slate-100">
                          {apt.customerName}
                        </p>
                        <p className="truncate text-slate-500 dark:text-slate-400">
                          {apt.serviceName}
                        </p>
                        <div className="mt-1.5 flex gap-3">
                          <button
                            type="button"
                            onClick={() => openEdit(apt)}
                            className="text-[11px] font-medium text-[var(--accent-700)] hover:underline cursor-pointer"
                          >
                            Editar
                          </button>
                          {apt.status === 'confirmed' && (
                            <button
                              type="button"
                              onClick={() => setCancelTarget(apt)}
                              className="text-[11px] font-medium text-red-600 hover:underline dark:text-red-400 cursor-pointer"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-over Drawer: Nueva cita */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-apt-title"
        >
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            onClick={closeDrawer}
          />
          <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h2
                id="new-apt-title"
                className="text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                {editing ? 'Editar cita' : 'Nueva cita manual'}
              </h2>
              <button
                type="button"
                onClick={closeDrawer}
                aria-label="Cerrar formulario"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleCreateSubmit}
              className="flex flex-1 flex-col justify-between overflow-y-auto p-6"
            >
              <div className="space-y-4">
                <div>
                  <Label htmlFor="new-apt-service">
                    Servicio
                  </Label>
                  <Select
                    id="new-apt-service"
                    value={formServiceId}
                    onChange={(e) => setFormServiceId(e.target.value)}
                    className="mt-1.5"
                  >
                    {activeServices.length === 0 ? (
                      <option value="">No hay servicios activos</option>
                    ) : (
                      activeServices.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.durationMinutes} min ·{' '}
                          {formatCurrency(s.price, settings.currency)})
                        </option>
                      ))
                    )}
                  </Select>
                </div>

                <div>
                  <Label htmlFor="new-apt-date">
                    Fecha
                  </Label>
                  <Input
                    id="new-apt-date"
                    type="date"
                    min={todayStr}
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="mt-1.5 font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="new-apt-time">
                    Hueco libre
                  </Label>
                  {freeSlots.length === 0 ? (
                    <p className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                      No quedan huecos disponibles para esta fecha y servicio.
                    </p>
                  ) : (
                    <Select
                      id="new-apt-time"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="mt-1.5 font-mono"
                    >
                      {freeSlots.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>

                <div>
                  <Label htmlFor="new-apt-name">
                    Nombre del cliente
                  </Label>
                  <Input
                    id="new-apt-name"
                    value={formName}
                    disabled={Boolean(editing)}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ej. Sergio Navarro"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="new-apt-contact">
                    Teléfono o correo
                  </Label>
                  <Input
                    id="new-apt-contact"
                    value={formContact}
                    disabled={Boolean(editing)}
                    onChange={(e) => setFormContact(e.target.value)}
                    placeholder="Ej. +34 612 345 678"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="new-apt-channel">
                    Canal
                  </Label>
                  <Select
                    id="new-apt-channel"
                    value={formChannel}
                    disabled={Boolean(editing)}
                    onChange={(e) =>
                      setFormChannel(e.target.value as 'web' | 'whatsapp')
                    }
                    className="mt-1.5"
                  >
                    <option value="web">Web / Recepción</option>
                    <option value="whatsapp">WhatsApp</option>
                  </Select>
                </div>

                {editing && (
                  <div>
                    <Label htmlFor="new-apt-notes">Notas internas</Label>
                    <Textarea
                      id="new-apt-notes"
                      rows={3}
                      maxLength={500}
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Solo las ve el negocio"
                      className="mt-1.5"
                    />
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Si cambias fecha, hora o servicio, se avisará al cliente por WhatsApp.
                    </p>
                  </div>
                )}

                {formError && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {formError}
                  </p>
                )}
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                <Button
                  variant="outline"
                  onClick={closeDrawer}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={freeSlots.length === 0 || saving}>
                  {editing ? (saving ? 'Guardando…' : 'Guardar cambios') : 'Guardar cita'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancelar con motivo */}
      <Dialog
        open={Boolean(cancelTarget)}
        onClose={closeCancel}
        title="¿Cancelar esta cita?"
        description={
          cancelTarget
            ? `Cita de ${cancelTarget.customerName}: ${cancelTarget.serviceName}, ${cancelTarget.date} a las ${cancelTarget.time}. La franja volverá a quedar libre.`
            : undefined
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="cancel-reason">Motivo de la cancelación</Label>
            <Textarea
              id="cancel-reason"
              rows={3}
              maxLength={500}
              autoFocus
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ej. El profesional está enfermo ese día."
              className="mt-1.5"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Se enviará al cliente por WhatsApp junto con el aviso de cancelación.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeCancel}>
              Mantener cita
            </Button>
            <Button variant="danger" onClick={() => void handleConfirmCancel()} disabled={saving || cancelReason.trim().length < 3}>
              {saving ? 'Cancelando…' : 'Cancelar y avisar'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Eliminar */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="¿Eliminar esta cita?"
        description={
          deleteTarget
            ? `Se borrará del listado la cita de ${deleteTarget.customerName} (${deleteTarget.date} a las ${deleteTarget.time}). No se avisa al cliente: si la cita sigue en pie, mejor cancélala.`
            : undefined
        }
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Volver
          </Button>
          <Button variant="danger" onClick={() => void handleConfirmDelete()} disabled={saving}>
            Eliminar
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
