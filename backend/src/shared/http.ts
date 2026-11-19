import type { ErrorRequestHandler, RequestHandler } from 'express';
import { z } from 'zod';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export const notFound = (what = 'Recurso') => new HttpError(404, `${what} no encontrado`);

/** Valida datos de entrada (límite de confianza) y devuelve 400 con el detalle. */
export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new HttpError(400, 'Datos inválidos', z.flattenError(result.error).fieldErrors);
  }
  return result.data;
}

export const uuidParam = z.uuid({ message: 'id inválido' });

// Errores de PostgreSQL que son culpa del cliente, no del servidor.
const PG_ERRORS: Record<string, [number, string]> = {
  '23505': [409, 'Ya existe un registro con esos datos'],
  '23P01': [409, 'Ese horario ya está ocupado'],
  '23514': [400, 'Los datos no cumplen las reglas de validación'],
  '23503': [400, 'Referencia a un registro inexistente'],
  '22P02': [400, 'Formato de dato inválido'],
};

export const routeNotFound: RequestHandler = (_req, _res, next) => next(notFound('Ruta'));

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message, details: err.details });
    return;
  }
  const pg = PG_ERRORS[err?.code as string];
  if (pg) {
    res.status(pg[0]).json({ message: pg[1], details: err.constraint ?? err.detail });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ message: 'JSON mal formado' });
    return;
  }
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ message: 'Petición demasiado grande' });
    return;
  }
  console.error(err);
  res.status(500).json({ message: 'Error interno del servidor' });
};
