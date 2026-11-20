/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { Label, Card } from '@/components/ui';
import * as React from 'react';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../../lib/booking/timezone';
import { useAppStore } from '../../store/useAppStore';
import type { ServiceItem } from '../../store/types';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { Input, Textarea } from '../ui/input';
import { Switch } from '../ui/switch';

export function ServicesSection() {
  const services = useAppStore((s) => s.services);
  const addService = useAppStore((s) => s.addService);
  const updateService = useAppStore((s) => s.updateService);
  const toggleServiceActive = useAppStore((s) => s.toggleServiceActive);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ServiceItem | null>(null);

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [durationMinutes, setDurationMinutes] = React.useState('30');
  const [price, setPrice] = React.useState('15');
  const [active, setActive] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setDurationMinutes('30');
    setPrice('15');
    setActive(true);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (srv: ServiceItem) => {
    setEditing(srv);
    setName(srv.name);
    setDescription(srv.description);
    setDurationMinutes(String(srv.durationMinutes));
    setPrice(String(srv.price));
    setActive(srv.active);
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const dur = Number(durationMinutes);
    const pr = Number(price);

    if (!trimmedName) {
      setError('El nombre del servicio es obligatorio.');
      return;
    }
    if (!Number.isFinite(dur) || dur < 5 || dur > 240) {
      setError('La duración debe estar entre 5 y 240 minutos.');
      return;
    }
    if (!Number.isFinite(pr) || pr < 0) {
      setError('El precio debe ser un número mayor o igual a 0.');
      return;
    }

    if (editing) {
      updateService(editing.id, {
        name: trimmedName,
        description: description.trim(),
        durationMinutes: Math.round(dur),
        price: Number(pr.toFixed(2)),
        active,
      });
      toast.success(`Servicio "${trimmedName}" actualizado.`);
    } else {
      addService({
        name: trimmedName,
        description: description.trim(),
        durationMinutes: Math.round(dur),
        price: Number(pr.toFixed(2)),
        active,
      });
      toast.success(`Servicio "${trimmedName}" añadido.`);
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Los cambios en servicios se reflejan de inmediato en el chat y la agenda.
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nuevo servicio
        </Button>
      </div>

      {services.length === 0 ? (
        <Card className="py-12 text-center px-4">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            No hay servicios configurados
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Añade tu primer servicio para empezar a aceptar reservas.
          </p>
          <Button size="sm" className="mt-4" onClick={openCreate}>
            Añadir servicio
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {services.map((srv) => (
            <Card
              key={srv.id}
              className="flex flex-col justify-between p-5"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {srv.name}
                    </h2>
                    <div className="mt-1 flex items-center gap-2 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      <span>{srv.durationMinutes} min</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(srv.price)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          srv.active
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400'
                        }
                      >
                        {srv.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                  <Switch
                    checked={srv.active}
                    onCheckedChange={() => {
                      toggleServiceActive(srv.id);
                      toast.success(
                        srv.active
                          ? `"${srv.name}" desactivado`
                          : `"${srv.name}" activado`
                      );
                    }}
                    label={`Activar o desactivar ${srv.name}`}
                  />
                </div>
                {srv.description && (
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                    {srv.description}
                  </p>
                )}
              </div>

              <div className="mt-4 flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
                <Button variant="ghost" size="sm" onClick={() => openEdit(srv)}>
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Editar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar servicio' : 'Nuevo servicio'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="srv-name">
              Nombre
            </Label>
            <Input
              id="srv-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Degradado + lavado"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="srv-desc">
              Descripción
            </Label>
            <Textarea
              id="srv-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve detalle para el cliente…"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="srv-dur">
                Duración (min)
              </Label>
              <Input
                id="srv-dur"
                type="number"
                min={5}
                max={240}
                step={5}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label htmlFor="srv-price">
                Precio (USD $)
              </Label>
              <Input
                id="srv-price"
                type="number"
                min={0}
                step="0.5"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Servicio activo
            </span>
            <Switch
              checked={active}
              onCheckedChange={setActive}
              label="Servicio activo"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editing ? 'Guardar cambios' : 'Crear servicio'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
