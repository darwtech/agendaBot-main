import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { env } from '../../config/env.js';

/**
 * Consumo de la IA del servidor (compartido por todos los negocios: es la misma clave).
 * Peticiones/día y tokens/minuto los informa el proveedor en cabeceras; los tokens/día los contamos aquí
 * y se corrigen con el dato real cuando el proveedor devuelve un error de límite diario.
 * shortcut: archivo JSON por proceso; con varias instancias del backend, guardarlo en PostgreSQL.
 */
export interface AIUsage {
  provider: string;
  model: string;
  /** Día UTC al que se refieren los contadores (Groq reinicia sus límites diarios en UTC). */
  day: string;
  requestsToday: number;
  tokensToday: number;
  dailyTokenLimit: number | null;
  requests: { limit: number; remaining: number; resetIn: string | null } | null;
  tokensPerMinute: { limit: number; remaining: number } | null;
  lastLimitError: string | null;
  updatedAt: string | null;
}

// AI_USAGE_FILE solo para tests (no tocar el contador real).
const FILE = process.env.AI_USAGE_FILE ?? path.join(process.cwd(), 'data', 'ai-usage.json');
// Límite gratuito de tokens por día de Groq para los modelos habituales; AI_DAILY_TOKEN_LIMIT lo sobrescribe.
const DEFAULT_DAILY_TOKENS: Record<string, number> = { groq: 200_000 };

const today = () => new Date().toISOString().slice(0, 10);

function fresh(): AIUsage {
  return {
    provider: env.AI_PROVIDER,
    model: '',
    day: today(),
    requestsToday: 0,
    tokensToday: 0,
    dailyTokenLimit: env.AI_DAILY_TOKEN_LIMIT || DEFAULT_DAILY_TOKENS[env.AI_PROVIDER] || null,
    requests: null,
    tokensPerMinute: null,
    lastLimitError: null,
    updatedAt: null,
  };
}

let usage: AIUsage = load();

function load(): AIUsage {
  try {
    if (existsSync(FILE)) {
      const saved = JSON.parse(readFileSync(FILE, 'utf8')) as AIUsage;
      if (saved.day === today() && saved.provider === env.AI_PROVIDER) return { ...fresh(), ...saved };
    }
  } catch {
    // archivo dañado: se empieza de cero
  }
  return fresh();
}

function save() {
  try {
    mkdirSync(path.dirname(FILE), { recursive: true });
    writeFileSync(FILE, JSON.stringify(usage));
  } catch (err) {
    console.error('No se pudo guardar el consumo de IA:', err);
  }
}

function rollDay() {
  if (usage.day !== today() || usage.provider !== env.AI_PROVIDER) usage = fresh();
}

const num = (v: string | null) => (v === null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

/** Anota una respuesta del proveedor: cabeceras de límite y tokens gastados. */
export function recordResponse(model: string, headers: Headers, totalTokens: number) {
  rollDay();
  usage.model = model;
  usage.requestsToday += 1;
  usage.tokensToday += totalTokens;
  const reqLimit = num(headers.get('x-ratelimit-limit-requests'));
  const reqRemaining = num(headers.get('x-ratelimit-remaining-requests'));
  if (reqLimit !== null && reqRemaining !== null) {
    usage.requests = { limit: reqLimit, remaining: reqRemaining, resetIn: headers.get('x-ratelimit-reset-requests') };
  }
  const tpmLimit = num(headers.get('x-ratelimit-limit-tokens'));
  const tpmRemaining = num(headers.get('x-ratelimit-remaining-tokens'));
  if (tpmLimit !== null && tpmRemaining !== null) usage.tokensPerMinute = { limit: tpmLimit, remaining: tpmRemaining };
  usage.updatedAt = new Date().toISOString();
  save();
}

/** Errores de límite: si el proveedor dice el límite diario y lo gastado, se toma como dato real. */
export function recordLimitError(body: string) {
  rollDay();
  const tpd = /\(TPD\): Limit (\d+), Used (\d+)/i.exec(body);
  if (tpd) {
    usage.dailyTokenLimit = Number(tpd[1]);
    usage.tokensToday = Math.max(usage.tokensToday, Number(tpd[2]));
  }
  usage.lastLimitError = /\((\w+)\): Limit/.exec(body)?.[1] ?? 'límite';
  usage.updatedAt = new Date().toISOString();
  save();
}

export function getUsage(): AIUsage {
  rollDay();
  return usage;
}
