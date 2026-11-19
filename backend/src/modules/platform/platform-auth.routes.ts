import { Router } from 'express';
import { pool, runInTenant } from '../../db/pool.js';
import { generateToken, hashToken } from '../../shared/auth.js';
import { HttpError, parse } from '../../shared/http.js';
import { DUMMY_HASH, verifyPassword } from '../../shared/password.js';
import { assertNotLocked, clearFailures, recordFailure } from '../../shared/rateLimit.js';
import { createSession, findUserByEmail } from '../auth/auth.repository.js';
import { loginSchema } from '../auth/auth.schema.js';

/** Inicio de sesión público: resuelve el negocio por correo para no pedir su URL al usuario. */
export const platformAuthRouter = Router();

platformAuthRouter.post('/login', async (req, res) => {
  const { email, password } = parse(loginSchema, req.body);
  const limitKey = `platform-login|${req.ip}`;
  assertNotLocked(limitKey);

  const { rows: tenants } = await pool.query<{ slug: string; schema_name: string }>(
    'SELECT slug, schema_name FROM public.tenants WHERE deleted_at IS NULL ORDER BY created_at'
  );

  for (const tenant of tenants) {
    const user = await runInTenant(tenant.schema_name, () => findUserByEmail(email));
    const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) continue;

    const token = generateToken();
    const expiresAt = await runInTenant(tenant.schema_name, () => createSession(user.id, hashToken(token)));
    clearFailures(limitKey);
    res.json({ slug: tenant.slug, token, expiresAt, user: { id: user.id, email: user.email, fullName: user.fullName } });
    return;
  }

  recordFailure(limitKey);
  throw new HttpError(401, 'Correo o contraseña incorrectos');
});
