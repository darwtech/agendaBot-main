/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { Router } from 'express';
import { runInTenant } from '../../db/pool.js';
import { generateToken, hashToken, PLATFORM_ACTOR_ID } from '../../shared/auth.js';
import { parse } from '../../shared/http.js';
import { assertNotLocked, recordFailure } from '../../shared/rateLimit.js';
import { createSession, findUserByEmail } from '../auth/auth.repository.js';
import { createTenant, freeSlug } from './tenants.repository.js';
import { signupSchema, slugFromName } from './tenants.schema.js';

export const signupRouter = Router();

// Registro público: crea negocio + dueño y devuelve ya una sesión abierta (activo al instante).
signupRouter.post('/', async (req, res) => {
  const limitKey = `signup|${req.ip}`;
  assertNotLocked(limitKey);
  // Cuenta cada intento (no solo fallos): cada alta crea un schema, así se frena la creación masiva por IP.
  recordFailure(limitKey);

  const data = parse(signupSchema, req.body);
  // shortcut: dos altas simultáneas con el mismo nombre pueden chocar (409); basta con reintentar.
  const slug = await freeSlug(slugFromName(data.name));
  const tenant = await createTenant({ ...data, slug }, PLATFORM_ACTOR_ID);
  const token = generateToken();
  const expiresAt = await runInTenant(tenant.schema, async () => {
    const user = await findUserByEmail(data.owner.email);
    return createSession(user!.id, hashToken(token));
  });
  res.status(201).json({ slug: tenant.slug, token, expiresAt });
});
