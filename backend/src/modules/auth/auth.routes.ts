/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { Router } from 'express';
import { bearer, generateToken, hashToken, requireAdmin } from '../../shared/auth.js';
import { HttpError, parse } from '../../shared/http.js';
import { DUMMY_HASH, verifyPassword } from '../../shared/password.js';
import { assertNotLocked, clearFailures, recordFailure } from '../../shared/rateLimit.js';
import { createSession, findUserByEmail, revokeSession } from './auth.repository.js';
import { loginSchema } from './auth.schema.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const { email, password } = parse(loginSchema, req.body);
  const limitKey = `${req.tenant!.slug}|${req.ip}`;
  assertNotLocked(limitKey);

  const user = await findUserByEmail(email);
  // Se verifica siempre (con un hash señuelo si no existe) para no revelar qué correos existen.
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    recordFailure(limitKey);
    throw new HttpError(401, 'Correo o contraseña incorrectos');
  }
  clearFailures(limitKey);

  const token = generateToken();
  const expiresAt = await createSession(user.id, hashToken(token));
  res.json({ token, expiresAt, user: { id: user.id, email: user.email, fullName: user.fullName } });
});

authRouter.get('/me', requireAdmin, (req, res) => {
  res.json(req.user);
});

authRouter.post('/logout', requireAdmin, async (req, res) => {
  await revokeSession(hashToken(bearer(req)), req.user!.id);
  res.status(204).end();
});
