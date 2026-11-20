/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { Router } from 'express';
import { requireAdmin } from '../../shared/auth.js';
import { getUsage } from './usage.js';

export const assistantRouter = Router();

// Consumo de la IA del servidor frente al límite del plan (para la barra del panel).
assistantRouter.get('/usage', requireAdmin, (_req, res) => {
  res.json(getUsage());
});
