import { Card } from '@/components/ui';
import * as React from 'react';
import { Search, User } from 'lucide-react';
import { formatCurrency } from '../../lib/booking/timezone';
import { useAppStore } from '../../store/useAppStore';
import { Input } from '../ui/input';
import { cn } from '../ui/utils';

export function CustomersSection() {
  const customers = useAppStore((s) => s.customers);
  const appointments = useAppStore((s) => s.appointments);
  const currency = useAppStore((s) => s.settings.currency);

  const [query, setQuery] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<string | null>(
    customers[0]?.id ?? null
  );

  const enrichedCustomers = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers
      .map((c) => {
        const custApts = appointments
          .filter((a) => a.customerId === c.id)
          .sort((a, b) => b.date.localeCompare(a.date));
        const confirmedApts = custApts.filter((a) => a.status === 'confirmed');
        const lastVisit = confirmedApts[0]?.date ?? custApts[0]?.date ?? null;
        return {
          ...c,
          totalCount: custApts.length,
          confirmedCount: confirmedApts.length,
          lastVisit,
          history: custApts,
        };
      })
      .filter((c) => {
        if (!q) return true;
        return (
          c.fullName.toLowerCase().includes(q) ||
          c.contact.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.totalCount - a.totalCount);
  }, [customers, appointments, query]);

  const selectedCustomer =
    enrichedCustomers.find((c) => c.id === selectedId) ??
    enrichedCustomers[0] ??
    null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Customer List */}
      <Card as="section" className="lg:col-span-7">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cliente por nombre o contacto…"
              aria-label="Buscar clientes"
              className="pl-9"
            />
          </div>
        </div>

        {enrichedCustomers.length === 0 ? (
          <div className="py-12 text-center px-4">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              No hay clientes registrados
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Los clientes aparecen automáticamente al confirmar reservas.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {enrichedCustomers.map((c) => {
              const isSelected = selectedCustomer?.id === c.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors cursor-pointer',
                      isSelected
                        ? 'bg-[var(--accent-50)]/70 dark:bg-slate-800/80'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {c.fullName}
                      </p>
                      <p className="truncate font-mono text-xs text-slate-500 dark:text-slate-400">
                        {c.contact}
                      </p>
                    </div>
                    <div className="shrink-0 text-right font-mono text-xs tabular-nums">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {c.totalCount} {c.totalCount === 1 ? 'cita' : 'citas'}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400">
                        {c.lastVisit ? `Última: ${c.lastVisit}` : 'Sin citas'}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Customer Detail */}
      <Card as="section" className="p-5 lg:col-span-5">
        {!selectedCustomer ? (
          <div className="py-12 text-center">
            <User className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" aria-hidden="true" />
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Selecciona un cliente para ver su ficha e historial.
            </p>
          </div>
        ) : (
          <div>
            <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {selectedCustomer.fullName}
              </h2>
              <p className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                {selectedCustomer.contact}
              </p>
              <div className="mt-3 flex gap-4 text-xs text-slate-600 dark:text-slate-400 font-mono tabular-nums">
                <span>
                  Confirmadas:{' '}
                  <strong className="text-slate-900 dark:text-slate-100">
                    {selectedCustomer.confirmedCount}
                  </strong>
                </span>
                <span>
                  Total:{' '}
                  <strong className="text-slate-900 dark:text-slate-100">
                    {selectedCustomer.totalCount}
                  </strong>
                </span>
              </div>
            </div>

            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Historial de citas
            </h3>

            {selectedCustomer.history.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Sin citas registradas todavía.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                {selectedCustomer.history.map((apt) => (
                  <li
                    key={apt.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {apt.serviceName}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {apt.date} · {apt.time}
                      </p>
                    </div>
                    <div className="shrink-0 text-right font-mono tabular-nums">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(apt.price, currency)}
                      </p>
                      <p
                        className={
                          apt.status === 'confirmed'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }
                      >
                        {apt.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
