import { Label, Card } from '@/components/ui';
import { toast } from 'sonner';
import { IANA_TIMEZONES } from '../../lib/booking/timezone';
import { useAppStore } from '../../store/useAppStore';
import type { SlotInterval } from '../../store/types';
import { Input, Select, Textarea } from '../ui/input';

export function BusinessTab() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  return (
    <div className="max-w-2xl">
      <Card as="section" className="p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Datos del negocio y agenda
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Personaliza el nombre visible en el chat, la zona horaria y la cuadrícula de huecos.
          </p>
        </div>

        <div>
          <Label htmlFor="biz-name">
            Nombre del negocio
          </Label>
          <Input
            id="biz-name"
            value={settings.businessName}
            onChange={(e) => updateSettings({ businessName: e.target.value })}
            placeholder="Mi negocio"
            className="mt-1.5"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="biz-address">Dirección</Label>
            <Input
              id="biz-address"
              value={settings.address ?? ''}
              onChange={(e) => updateSettings({ address: e.target.value })}
              placeholder="Calle Mayor 12, Madrid"
              maxLength={200}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="biz-phone">Teléfono de contacto</Label>
            <Input
              id="biz-phone"
              type="tel"
              value={settings.phone ?? ''}
              onChange={(e) => updateSettings({ phone: e.target.value })}
              placeholder="+34 600 000 000"
              maxLength={40}
              className="mt-1.5"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="biz-tz">
            Zona horaria (IANA)
          </Label>
          <Select
            id="biz-tz"
            value={settings.timezone}
            onChange={(e) => {
              updateSettings({ timezone: e.target.value });
              toast.success(`Zona horaria actualizada a ${e.target.value}.`);
            }}
            className="mt-1.5 font-mono text-xs"
          >
            {IANA_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Se usa para descartar horas pasadas del día actual.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="biz-interval">
              Intervalo de huecos
            </Label>
            <Select
              id="biz-interval"
              value={String(settings.slotInterval)}
              onChange={(e) => {
                const val = Number(e.target.value) as SlotInterval;
                updateSettings({ slotInterval: val });
                toast.success(`Intervalo cambiado a ${val} minutos.`);
              }}
              className="mt-1.5 font-mono"
            >
              <option value="15">Cada 15 min</option>
              <option value="30">Cada 30 min</option>
              <option value="60">Cada 60 min</option>
            </Select>
          </div>
          <div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Moneda</span>
            <p className="mt-1.5 flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">Dólar estadounidense (USD $)</p>
          </div>

        </div>
      </Card>

      <Card as="section" className="mt-6 p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Asistente de WhatsApp</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            La IA usa estos datos junto con tus servicios, precios y horario para responder a cada mensaje.
          </p>
        </div>

        <div>
          <Label htmlFor="biz-welcome">Mensaje de bienvenida</Label>
          <Textarea
            id="biz-welcome"
            rows={3}
            maxLength={1000}
            value={settings.welcomeMessage ?? ''}
            onChange={(e) => updateSettings({ welcomeMessage: e.target.value })}
            placeholder="¡Hola! 👋 Bienvenido/a a {{negocio}}. Soy el asistente virtual: puedo darte información de servicios, precios y horarios, y reservar tu cita. ¿En qué te ayudo?"
            className="mt-1.5"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Se envía la primera vez que alguien escribe. <code className="font-mono">{'{{negocio}}'}</code> se cambia por el nombre. Vacío = mensaje de ejemplo.
          </p>
        </div>

        <div>
          <Label htmlFor="biz-info">Información e instrucciones para el asistente</Label>
          <Textarea
            id="biz-info"
            rows={6}
            maxLength={4000}
            value={settings.businessInfo ?? ''}
            onChange={(e) => updateSettings({ businessInfo: e.target.value })}
            placeholder={`Formas de pago: efectivo, tarjeta y Bizum.
Hay aparcamiento gratuito en la puerta.
Para cancelar, avisar con 24 h de antelación.
Trata a los clientes de tú.`}
            className="mt-1.5"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Todo lo que quieras que sepa: pagos, políticas, promociones, cómo llegar, tono de las respuestas…
          </p>
        </div>
      </Card>
    </div>
  );
}
