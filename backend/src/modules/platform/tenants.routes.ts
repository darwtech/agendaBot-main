import { Router } from 'express';
import { PLATFORM_ACTOR_ID, requirePlatform } from '../../shared/auth.js';
import { parse } from '../../shared/http.js';
import { userUpsertSchema } from '../auth/auth.schema.js';
import * as repo from './tenants.repository.js';
import { slugSchema, tenantCreateSchema, tenantPatchSchema } from './tenants.schema.js';

export const tenantsRouter = Router();
tenantsRouter.use(requirePlatform);

tenantsRouter.get('/', async (_req, res) => {
  res.json(await repo.listTenants());
});

tenantsRouter.post('/', async (req, res) => {
  const created = await repo.createTenant(parse(tenantCreateSchema, req.body), PLATFORM_ACTOR_ID);
  res.status(201).json(created);
});

tenantsRouter.patch('/:slug', async (req, res) => {
  const slug = parse(slugSchema, req.params.slug);
  res.json(await repo.updateTenant(slug, parse(tenantPatchSchema, req.body), PLATFORM_ACTOR_ID));
});

// Alta de usuario del panel o restablecer su contraseña.
tenantsRouter.post('/:slug/users', async (req, res) => {
  const slug = parse(slugSchema, req.params.slug);
  const result = await repo.setTenantUser(slug, parse(userUpsertSchema, req.body), PLATFORM_ACTOR_ID);
  res.status(result.created ? 201 : 200).json(result);
});
