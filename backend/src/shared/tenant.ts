import type { RequestHandler } from 'express';
import { runInTenant } from '../db/pool.js';
import { findActiveTenant, type Tenant } from '../modules/platform/tenants.repository.js';
import { notFound } from './http.js';

declare module 'express-serve-static-core' {
  interface Request {
    tenant?: Tenant;
  }
}

/** Resuelve /api/t/:tenant y ejecuta el resto de la petición dentro del schema de ese negocio. */
export const tenantContext: RequestHandler = async (req, _res, next) => {
  const tenant = await findActiveTenant(String(req.params.tenant));
  if (!tenant) throw notFound('Negocio');
  req.tenant = tenant;
  runInTenant(tenant.schema, () => next());
};
