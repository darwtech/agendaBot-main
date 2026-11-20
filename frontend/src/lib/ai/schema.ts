/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { z } from 'zod';
import type { AIIntentType, ParsedAIIntent } from '../../store/types';
import { isValidDateStr, isValidTimeStr } from '../booking/timezone';

export const ALLOWED_INTENTS = [
  'FAQ',
  'CHECK_AVAILABILITY',
  'BOOK_APPOINTMENT',
  'CONFIRM',
  'CANCEL',
  'OTHER',
] as const;

export const StrictAIIntentSchema = z.object({
  intent: z.enum(ALLOWED_INTENTS),
  date: z
    .string()
    .refine((v) => isValidDateStr(v), 'Fecha inválida')
    .nullable(),
  time: z
    .string()
    .refine((v) => isValidTimeStr(v), 'Hora inválida')
    .nullable(),
  service: z.string().min(1).nullable(),
  fullName: z.string().min(1).nullable(),
  contact: z.string().min(1).nullable(),
});

const IntentFieldSchema = z.enum(ALLOWED_INTENTS);
const DateFieldSchema = z
  .string()
  .trim()
  .refine((v) => isValidDateStr(v));
const TimeFieldSchema = z
  .string()
  .trim()
  .transform((v) => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(v);
    if (!match) return v;
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  })
  .refine((v) => isValidTimeStr(v));
const NonEmptyTextSchema = z
  .string()
  .trim()
  .min(1)
  .transform((v) => (v.toLowerCase() === 'null' ? null : v))
  .nullable();

export function extractJsonSubstring(rawText: string): string | null {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  // Strip ```json ... ``` fences if present
  const fenceMatch = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;

  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return null;
  }
  return candidate.slice(firstBrace, lastBrace + 1);
}

export interface SanitizeIntentResult {
  ok: boolean;
  data: ParsedAIIntent;
  hadInvalidFields: boolean;
  parseError?: string;
}

export function sanitizeIntentObject(obj: unknown): SanitizeIntentResult {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return {
      ok: false,
      data: {
        intent: 'OTHER',
        date: null,
        time: null,
        service: null,
        fullName: null,
        contact: null,
      },
      hadInvalidFields: true,
      parseError: 'La respuesta JSON no es un objeto.',
    };
  }

  const record = obj as Record<string, unknown>;
  let hadInvalidFields = false;

  const intentParsed = IntentFieldSchema.safeParse(record.intent);
  const intent: AIIntentType = intentParsed.success ? intentParsed.data : 'OTHER';
  if (!intentParsed.success) hadInvalidFields = true;

  let date: string | null = null;
  if (record.date !== null && record.date !== undefined) {
    const res = DateFieldSchema.safeParse(record.date);
    if (res.success) {
      date = res.data;
    } else {
      hadInvalidFields = true;
    }
  }

  let time: string | null = null;
  if (record.time !== null && record.time !== undefined) {
    const res = TimeFieldSchema.safeParse(record.time);
    if (res.success) {
      time = res.data;
    } else {
      hadInvalidFields = true;
    }
  }

  const parseNullableText = (val: unknown): string | null => {
    if (val === null || val === undefined || val === '') return null;
    const res = NonEmptyTextSchema.safeParse(val);
    if (res.success) return res.data;
    hadInvalidFields = true;
    return null;
  };

  const service = parseNullableText(record.service);
  const fullName = parseNullableText(record.fullName);
  const contact = parseNullableText(record.contact);

  return {
    ok: true,
    data: {
      intent,
      date,
      time,
      service,
      fullName,
      contact,
    },
    hadInvalidFields,
  };
}

export function parseAndSanitizeAIIntent(rawText: string): SanitizeIntentResult {
  const jsonSlice = extractJsonSubstring(rawText);
  if (!jsonSlice) {
    return {
      ok: false,
      data: {
        intent: 'OTHER',
        date: null,
        time: null,
        service: null,
        fullName: null,
        contact: null,
      },
      hadInvalidFields: true,
      parseError: 'No se encontró un bloque JSON en la respuesta.',
    };
  }

  try {
    const parsed = JSON.parse(jsonSlice);
    return sanitizeIntentObject(parsed);
  } catch {
    return {
      ok: false,
      data: {
        intent: 'OTHER',
        date: null,
        time: null,
        service: null,
        fullName: null,
        contact: null,
      },
      hadInvalidFields: true,
      parseError: 'JSON malformado en la respuesta del modelo.',
    };
  }
}
