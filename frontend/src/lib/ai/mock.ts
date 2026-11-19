import type { AIIntentType, AIProviderConfig, ParsedAIIntent } from '../../store/types';
import {
  addDaysToDateStr,
  getNowPartsInTimezone,
  getWeekdayFromDateStr,
  isValidDateStr,
} from '../booking/timezone';
import type { AICompleteParams, AIProvider, AITestResult } from './types';

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function extractTodayFromSystem(system: string): string {
  const match = /hoy es\s+(\d{4}-\d{2}-\d{2})/i.exec(system);
  if (match && isValidDateStr(match[1])) {
    return match[1];
  }
  return getNowPartsInTimezone('Europe/Madrid').dateStr;
}

function extractDate(text: string, todayStr: string): string | null {
  const norm = normalizeText(text);

  // Explicit YYYY-MM-DD
  const isoMatch = /\b(\d{4}-\d{2}-\d{2})\b/.exec(norm);
  if (isoMatch && isValidDateStr(isoMatch[1])) {
    return isoMatch[1];
  }

  // DD/MM/YYYY or DD/MM
  const slashMatch = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/.exec(norm);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, '0');
    const month = slashMatch[2].padStart(2, '0');
    const year = slashMatch[3] ?? todayStr.slice(0, 4);
    const candidate = `${year}-${month}-${day}`;
    if (isValidDateStr(candidate)) return candidate;
  }

  if (/\bpasado manana\b/.test(norm)) {
    return addDaysToDateStr(todayStr, 2);
  }
  if (/\bmanana\b/.test(norm)) {
    return addDaysToDateStr(todayStr, 1);
  }
  if (/\bhoy\b/.test(norm)) {
    return todayStr;
  }

  const weekdays: Array<[string, number]> = [
    ['domingo', 0],
    ['lunes', 1],
    ['martes', 2],
    ['miercoles', 3],
    ['jueves', 4],
    ['viernes', 5],
    ['sabado', 6],
  ];

  const todayDow = getWeekdayFromDateStr(todayStr);
  for (const [name, targetDow] of weekdays) {
    if (new RegExp(`\\b${name}\\b`).test(norm)) {
      let diff = (targetDow - todayDow + 7) % 7;
      if (diff === 0) diff = 7;
      return addDaysToDateStr(todayStr, diff);
    }
  }

  return null;
}

function extractTime(text: string): string | null {
  const norm = normalizeText(text);

  // HH:MM
  const hhmm = /\b([01]?\d|2[0-3]):([0-5]\d)\b/.exec(norm);
  if (hhmm) {
    return `${hhmm[1].padStart(2, '0')}:${hhmm[2]}`;
  }

  // "a las 5 de la tarde", "a las 11", "las 17h"
  const spoken =
    /\b(?:a\s+las?|las?)\s+(\d{1,2})(?:\s*(?:h|horas))?(?:\s+y\s+(media|cuarto))?(?:\s+de\s+la\s+(manana|tarde|noche))?\b/.exec(
      norm
    );
  if (spoken) {
    let hour = Number(spoken[1]);
    const fraction = spoken[2];
    const period = spoken[3];
    if ((period === 'tarde' || period === 'noche') && hour < 12) {
      hour += 12;
    } else if (!period && hour >= 1 && hour <= 8) {
      // Horario comercial típico: "a las 1..8" sin más contexto significa 13:00..20:00
      hour += 12;
    }
    if (hour >= 0 && hour <= 23) {
      const minute = fraction === 'media' ? '30' : fraction === 'cuarto' ? '15' : '00';
      return `${String(hour).padStart(2, '0')}:${minute}`;
    }
  }

  return null;
}

/** Servicios del negocio tal como el motor los lista en el prompt: "- Nombre (30 min, $15)". */
function servicesFromSystem(system: string): string[] {
  return [...system.matchAll(/^- (.+?) \(\d+ min/gm)].map((m) => m[1]);
}

/**
 * Detecta el servicio entre los del negocio (sirve para cualquier tipo de negocio).
 * 1) nombre completo mencionado (el más largo gana: "Corte + barba" antes que "Corte");
 * 2) si no, el servicio con más palabras significativas (4+ letras) mencionadas.
 */
export function extractService(text: string, services: string[]): string | null {
  const norm = normalizeText(text);
  const byLength = [...services].sort((a, b) => b.length - a.length);
  const full = byLength.find((name) => norm.includes(normalizeText(name)));
  if (full) return full;

  let best: string | null = null;
  let bestScore = 0;
  for (const name of byLength) {
    const words = normalizeText(name).split(/[^a-z0-9ñ]+/).filter((w) => w.length >= 4);
    const score = words.filter((w) => new RegExp(`\\b${w}`).test(norm)).length;
    if (score > bestScore) {
      best = name;
      bestScore = score;
    }
  }
  return best;
}

function extractContact(text: string): string | null {
  const emailMatch = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.exec(text);
  if (emailMatch) return emailMatch[0].trim();

  const phoneMatch = /(?:\+?\d{1,3}[\s-]?)?(?:\d[\s-]?){8,12}\d/.exec(text);
  if (phoneMatch) {
    const cleaned = phoneMatch[0].replace(/\s+/g, ' ').trim();
    if (cleaned.replace(/\D/g, '').length >= 9) {
      return cleaned;
    }
  }
  return null;
}

function extractFullName(
  text: string,
  lastAssistantMessage: string,
  extractedContact: string | null
): string | null {
  const explicitMatch =
    /(?:me llamo|mi nombre es|soy|a nombre de)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]+){0,3})/i.exec(
      text
    );
  if (explicitMatch) {
    return explicitMatch[1].trim();
  }

  // Strip contact if present in the same message ("Carlos Ruiz, 612345678")
  let stripped = text;
  if (extractedContact) {
    stripped = stripped.replace(extractedContact, '');
  }
  stripped = stripped.replace(/[,;.\-]/g, ' ').replace(/\s+/g, ' ').trim();

  const askedForName = /nombre/i.test(lastAssistantMessage);
  if (askedForName && stripped.length >= 3 && stripped.length <= 50) {
    const words = stripped.split(' ').filter(Boolean);
    const hasDigits = /\d/.test(stripped);
    const norm = normalizeText(stripped);
    const isCommand = /^(si|no|cancelar|hola|ver servicios|reservar|ayuda)/.test(norm);
    if (!hasDigits && !isCommand && words.length >= 1 && words.length <= 4) {
      return stripped;
    }
  }

  return null;
}

function detectIntent(
  text: string,
  extracted: Omit<ParsedAIIntent, 'intent'>,
  lastAssistantMessage: string
): AIIntentType {
  const norm = normalizeText(text).trim();

  if (/\b(cancelar|anular|anulacion|cancelacion|borrar cita)\b/.test(norm)) {
    return 'CANCEL';
  }

  if (
    /(?:^|[\s.,¡!¿?])(si|confirmo|confirmar|vale|perfecto|de acuerdo|adelante)(?:$|[\s.,¡!¿?])/.test(
      norm
    ) &&
    /confirmas|resumen/i.test(lastAssistantMessage)
  ) {
    return 'CONFIRM';
  }

  const wantsBookingVerb =
    /\b(reservar|reserva|cita|turno|agendar|apuntar|apuntarme|quiero un|quiero una)\b/.test(
      norm
    );
  const asksAvailability =
    /\b(hueco|huecos|disponible|disponibles|disponibilidad|libre|libres|horarios? para|que horas|cuando hay)\b/.test(
      norm
    );
  const asksFaq =
    /\b(servicios?|precios?|tarifas?|cuesta|cuanto vale|horario|abierto|abris|donde|direccion|telefono)\b/.test(
      norm
    );

  if (wantsBookingVerb) return 'BOOK_APPOINTMENT';
  if (asksAvailability && !extracted.time) return 'CHECK_AVAILABILITY';
  if (asksFaq && !extracted.date && !extracted.time) return 'FAQ';

  if (
    extracted.service ||
    extracted.date ||
    extracted.time ||
    extracted.fullName ||
    extracted.contact
  ) {
    return 'BOOK_APPOINTMENT';
  }

  if (asksAvailability) return 'CHECK_AVAILABILITY';
  if (asksFaq) return 'FAQ';

  return 'OTHER';
}

export const mockProvider: AIProvider = {
  id: 'mock',
  name: 'Modo demo',
  models: ['demo-local'],
  allowsCustomModel: false,

  async complete({ system, messages }: AICompleteParams): Promise<string> {
    // Subtle realistic local delay (~220ms)
    await new Promise((resolve) => setTimeout(resolve, 180));

    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const lastAssistant =
      [...messages].reverse().find((m) => m.role === 'assistant')?.content ?? '';

    const todayStr = extractTodayFromSystem(system);
    const service = extractService(lastUser, servicesFromSystem(system));
    const date = extractDate(lastUser, todayStr);
    const time = extractTime(lastUser);
    const contact = extractContact(lastUser);
    const fullName = extractFullName(lastUser, lastAssistant, contact);

    const intent = detectIntent(
      lastUser,
      { date, time, service, fullName, contact },
      lastAssistant
    );

    const payload: ParsedAIIntent = {
      intent,
      date,
      time,
      service,
      fullName,
      contact,
    };

    return JSON.stringify(payload);
  },

  async testConnection(_config: AIProviderConfig): Promise<AITestResult> {
    const start = performance.now();
    await new Promise((resolve) => setTimeout(resolve, 80));
    return {
      ok: true,
      latencyMs: Math.round(performance.now() - start),
      message: 'Simulador local listo (sin llamadas externas).',
    };
  },
};
