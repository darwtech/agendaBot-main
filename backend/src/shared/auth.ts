/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, RequestHandler } from 'express';
import { env } from '../config/env.js';
import { findSessionUser, type SessionUser } from '../modules/auth/auth.repository.js';
import { HttpError } from './http.js';

declare module 'express-serve-static-core' {
  interface Request {
    /** Usuario del panel con sesión válida en este negocio (si la hay). */
    user?: SessionUser;
  }
}

/** Actor de las acciones hechas por la plataforma (CLI o API de plataforma). */
export const PLATFORM_ACTOR_ID = '00000000-0000-4000-8000-000000000002';

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const generateToken = () => randomBytes(24).toString('base64url');

export function bearer(req: Request): string {
  const header = req.get('authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

/** Si la petición trae un token de sesión válido de ESTE negocio, deja el usuario en req.user. */
export const loadSession: RequestHandler = async (req, _res, next) => {
  const token = bearer(req);
  if (token) req.user = (await findSessionUser(hashToken(token))) ?? undefined;
  next();
};

export const isAdmin = (req: Request): boolean => Boolean(req.user);

/** id del usuario que hace el cambio; null = visitante público (chat). */
export const actorOf = (req: Request): string | null => req.user?.id ?? null;

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(new HttpError(401, 'Inicia sesión para continuar'));
  next();
};

export const requirePlatform: RequestHandler = (req, _res, next) => {
  if (!env.PLATFORM_TOKEN) return next(new HttpError(403, 'API de plataforma deshabilitada'));
  const a = Buffer.from(bearer(req));
  const b = Buffer.from(env.PLATFORM_TOKEN);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return next(new HttpError(401, 'Token de plataforma inválido'));
  }
  next();
};
