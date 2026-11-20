/**
 * HopperSoft — Creador: Darwin Chavez
 */
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidDateStr(value: string): boolean {
  if (!DATE_REGEX.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function isValidTimeStr(value: string): boolean {
  return TIME_REGEX.test(value);
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getNowPartsInTimezone(
  timeZone: string,
  referenceDate: Date = new Date()
): { dateStr: string; timeStr: string; minutesOfDay: number; dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6 } {
  const safeTz = timeZone || 'Europe/Madrid';
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: safeTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      weekday: 'short',
    });
    const parts = formatter.formatToParts(referenceDate);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value ?? '';

    const year = get('year');
    const month = get('month');
    const day = get('day');
    let hour = Number(get('hour'));
    if (hour === 24) hour = 0;
    const minute = Number(get('minute'));
    const weekdayStr = get('weekday').toLowerCase();

    const weekdayMap: Record<string, 0 | 1 | 2 | 3 | 4 | 5 | 6> = {
      sun: 0,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
    };

    const dateStr = `${year}-${month}-${day}`;
    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    return {
      dateStr,
      timeStr,
      minutesOfDay: hour * 60 + minute,
      dayOfWeek: weekdayMap[weekdayStr.slice(0, 3)] ?? getWeekdayFromDateStr(dateStr),
    };
  } catch {
    const iso = referenceDate.toISOString();
    const dateStr = iso.slice(0, 10);
    const hour = referenceDate.getUTCHours();
    const minute = referenceDate.getUTCMinutes();
    return {
      dateStr,
      timeStr: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      minutesOfDay: hour * 60 + minute,
      dayOfWeek: getWeekdayFromDateStr(dateStr),
    };
  }
}

export function getWeekdayFromDateStr(dateStr: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const [y, m, d] = dateStr.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  return utc.getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utc.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function formatDateEs(dateStr: string): string {
  if (!isValidDateStr(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(utc);
}

export function formatShortDateEs(dateStr: string): string {
  if (!isValidDateStr(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(utc);
}

export const DAY_NAMES_ES: Record<0 | 1 | 2 | 3 | 4 | 5 | 6, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

export const IANA_TIMEZONES = [
  'America/Guayaquil',
  'Pacific/Galapagos',
  'Europe/Madrid',
  'Atlantic/Canary',
  'Europe/London',
  'Europe/Paris',
  'America/Mexico_City',
  'America/Bogota',
  'America/Argentina/Buenos_Aires',
  'America/Santiago',
  'America/Lima',
  'America/New_York',
];

/** Precios siempre en dólares (USD), formato "$15" / "$15,50". El parámetro se ignora: se mantiene por compatibilidad. */
export function formatCurrency(amount: number, _currency?: string): string {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
