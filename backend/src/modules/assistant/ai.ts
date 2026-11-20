/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { env } from '../../config/env.js';
import { recordLimitError, recordResponse } from './usage.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Los tres proveedores hablan el formato de OpenAI (/chat/completions).
const PROVIDERS = {
  groq: () => ({ url: 'https://api.groq.com/openai/v1', key: env.GROQ_API_KEY, model: env.GROQ_MODEL || 'openai/gpt-oss-120b' }),
  deepseek: () => ({
    url: env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    key: env.DEEPSEEK_API_KEY,
    model: env.DEEPSEEK_MODEL || 'deepseek-chat',
  }),
  gemini: () => ({
    url: 'https://generativelanguage.googleapis.com/v1beta/openai',
    key: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL || 'gemini-2.5-flash',
  }),
};

const MAX_RETRIES = 3;

/** Segundos de espera que pide el proveedor ("try again in 2.37s" o cabecera retry-after), entre 1 y 15. */
export function retryDelayMs(body: string, retryAfter: string | null): number {
  const seconds = Number(retryAfter) || Number(/try again in ([\d.]+)s/i.exec(body)?.[1]) || 2;
  return Math.min(15, Math.max(1, seconds)) * 1000;
}

/** Llama al proveedor de IA configurado en .env y devuelve el texto de la respuesta. */
export async function complete(messages: ChatMessage[], timeoutMs = env.AI_TIMEOUT_MS): Promise<string> {
  const { url, key, model } = PROVIDERS[env.AI_PROVIDER]();
  if (!key) throw new Error(`Falta la clave ${env.AI_PROVIDER.toUpperCase()}_API_KEY en backend/.env`);
  let res: Response;
  for (let attempt = 0; ; attempt++) {
    res = await fetch(`${url.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages, temperature: 0.3 }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    // Límite por minuto (429) o caída momentánea (5xx): se espera lo que pide el proveedor y se reintenta.
    if ((res.status !== 429 && res.status < 500) || attempt >= MAX_RETRIES) break;
    const body = await res.text();
    if (res.status === 429) recordLimitError(body);
    const wait = retryDelayMs(body, res.headers.get('retry-after'));
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) recordLimitError(body);
    throw new Error(`IA ${env.AI_PROVIDER} respondió ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: { total_tokens?: number } };
  recordResponse(model, res.headers, data.usage?.total_tokens ?? 0);
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error(`IA ${env.AI_PROVIDER} devolvió una respuesta vacía`);
  return text;
}
