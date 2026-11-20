/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { DAYS_ES, weekday } from './slots.js';

type Appt = { serviceName: string; date: string; time: string; customerName: string; price?: number };

/** "jueves 20/11 a las 10:00" */
export const whenText = (date: string, time: string) =>
  `${DAYS_ES[weekday(date)]} ${date.slice(8, 10)}/${date.slice(5, 7)} a las ${time}`;

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export function cancelledByBusinessText(a: Appt, reason: string, business: string) {
  return (
    `Hola ${firstName(a.customerName)} 👋\n` +
    `Lamentamos informarte que tu cita de ${a.serviceName} del ${whenText(a.date, a.time)} en ${business} ha sido cancelada.\n` +
    `Motivo: ${reason}\n` +
    'Si quieres, responde a este mensaje y te ayudamos a reservar una nueva cita. Disculpa las molestias 🙏'
  );
}

export function rescheduledText(before: Appt, after: Appt, business: string) {
  return (
    `Hola ${firstName(after.customerName)} 👋\n` +
    `Tu cita en ${business} ha cambiado:\n` +
    `Antes: ${before.serviceName}, ${whenText(before.date, before.time)}\n` +
    `Ahora: ${after.serviceName}, ${whenText(after.date, after.time)}\n` +
    'Si no te viene bien, responde a este mensaje y lo vemos.'
  );
}

export function reminderLine(a: Appt & { status: string; cancelReason?: string | null }) {
  const base = `${a.serviceName}, ${whenText(a.date, a.time)}`;
  return a.status === 'cancelled' ? `${base} (cancelada${a.cancelReason ? `: ${a.cancelReason}` : ''})` : base;
}
