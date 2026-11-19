import { HttpError } from './http.js';

const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60_000;

// shortcut: en memoria y por proceso; con varias instancias del backend, mover a PostgreSQL o Redis.
const failures = new Map<string, { count: number; resetAt: number }>();

/** Lanza 429 si la clave acumula demasiados intentos fallidos recientes. */
export function assertNotLocked(key: string, now = Date.now()) {
  const entry = failures.get(key);
  if (entry && entry.resetAt <= now) failures.delete(key);
  else if (entry && entry.count >= MAX_FAILURES) {
    const minutes = Math.ceil((entry.resetAt - now) / 60_000);
    throw new HttpError(429, `Demasiados intentos. Vuelve a probar en ${minutes} min.`);
  }
}

export function recordFailure(key: string, now = Date.now()) {
  const entry = failures.get(key);
  if (!entry || entry.resetAt <= now) failures.set(key, { count: 1, resetAt: now + WINDOW_MS });
  else entry.count += 1;
}

export const clearFailures = (key: string) => failures.delete(key);
