/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { Card } from '@/components/ui';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarCheck2, CalendarRange, DollarSign, XCircle } from 'lucide-react';
import { AIUsageCard } from './AIUsageCard';
import {
  addDaysToDateStr,
  formatCurrency,
  formatShortDateEs,
  getNowPartsInTimezone,
} from '../../lib/booking/timezone';
import { useAppStore } from '../../store/useAppStore';

interface DashboardSectionProps {
  onGoToAppointments: () => void;
}

export function DashboardSection({ onGoToAppointments }: DashboardSectionProps) {
  const appointments = useAppStore((s) => s.appointments);
  const settings = useAppStore((s) => s.settings);

  const { dateStr: todayStr, timeStr: nowTimeStr } = getNowPartsInTimezone(
    settings.timezone
  );
  const weekEndStr = addDaysToDateStr(todayStr, 6);

  const todayConfirmed = appointments.filter(
    (a) => a.date === todayStr && a.status === 'confirmed'
  );

  const weekAppointments = appointments.filter(
    (a) => a.date >= todayStr && a.date <= weekEndStr
  );
  const weekConfirmed = weekAppointments.filter((a) => a.status === 'confirmed');

  const expectedRevenue = weekConfirmed.reduce((sum, a) => sum + a.price, 0);

  const totalCount = appointments.length;
  const cancelledCount = appointments.filter(
    (a) => a.status === 'cancelled'
  ).length;
  const cancellationRate =
    totalCount > 0 ? Math.round((cancelledCount / totalCount) * 100) : 0;

  // Next 7 days bar chart data
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const dayStr = addDaysToDateStr(todayStr, i);
    const dayLabel = formatShortDateEs(dayStr).replace(',', '');
    const confirmed = appointments.filter(
      (a) => a.date === dayStr && a.status === 'confirmed'
    ).length;
    const cancelled = appointments.filter(
      (a) => a.date === dayStr && a.status === 'cancelled'
    ).length;
    return {
      date: dayStr,
      label: dayLabel,
      confirmadas: confirmed,
      canceladas: cancelled,
    };
  });

  // Next 5 upcoming confirmed appointments
  const upcoming5 = [...appointments]
    .filter(
      (a) =>
        a.status === 'confirmed' &&
        (a.date > todayStr || (a.date === todayStr && a.time >= nowTimeStr))
    )
    .sort((a, b) =>
      a.date !== b.date
        ? a.date.localeCompare(b.date)
        : a.time.localeCompare(b.time)
    )
    .slice(0, 5);

  const kpis = [
    {
      label: 'Citas de hoy',
      value: String(todayConfirmed.length),
      sub: 'Confirmadas para hoy',
      icon: CalendarCheck2,
    },
    {
      label: 'Citas de la semana',
      value: String(weekConfirmed.length),
      sub: 'Próximos 7 días',
      icon: CalendarRange,
    },
    {
      label: 'Ingresos previstos',
      value: formatCurrency(expectedRevenue, settings.currency),
      sub: 'Reservas confirmadas (7 días)',
      icon: DollarSign,
    },
    {
      label: 'Tasa de cancelación',
      value: `${cancellationRate}%`,
      sub: `${cancelledCount} de ${totalCount} totales`,
      icon: XCircle,
    },
  ];

  return (
    <div className="space-y-6">
      <AIUsageCard />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.label}
              className="p-5"
            >
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>{kpi.label}</span>
                <Icon className="h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
              </div>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {kpi.value}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {kpi.sub}
              </p>
            </Card>
          );
        })}
      </div>

      {/* Chart + Upcoming 5 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card as="section" className="p-5 lg:col-span-7">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Citas por día
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Distribución de los próximos 7 días
              </p>
            </div>
          </div>

          <div className="mt-5 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(148, 163, 184, 0.25)"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                  contentStyle={{
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="confirmadas"
                  name="Confirmadas"
                  fill="#059669"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                />
                <Bar
                  dataKey="canceladas"
                  name="Canceladas"
                  fill="#cbd5e1"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card as="section" className="p-5 lg:col-span-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Próximos 5 turnos
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ordenados cronológicamente
              </p>
            </div>
            <button
              type="button"
              onClick={onGoToAppointments}
              className="text-xs font-medium text-[var(--accent-600)] hover:underline cursor-pointer"
            >
              Ver todas
            </button>
          </div>

          {upcoming5.length === 0 ? (
            <div className="mt-8 text-center py-8">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No hay próximos turnos confirmados.
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {upcoming5.map((apt) => (
                <li
                  key={apt.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {apt.customerName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                      {apt.serviceName} ·{' '}
                      {apt.channel === 'whatsapp' ? 'WhatsApp' : 'Web'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right font-mono text-xs tabular-nums">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {apt.time}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">
                      {formatShortDateEs(apt.date)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
