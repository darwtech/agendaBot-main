/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { Router } from 'express';
import { actorOf, requireAdmin } from '../../shared/auth.js';
import { parse } from '../../shared/http.js';
import { getSettings, updateSettings } from './settings.repository.js';
import { settingsPatchSchema } from './settings.schema.js';

export const settingsRouter = Router();

// El tipo de negocio viene del registro de plataforma; el frontend lo usa para adaptar textos.
settingsRouter.get('/', async (req, res) => {
  res.json({ ...(await getSettings()), businessType: req.tenant!.businessType });
});

settingsRouter.patch('/', requireAdmin, async (req, res) => {
  const patch = parse(settingsPatchSchema, req.body);
  res.json({ ...(await updateSettings(patch, actorOf(req))), businessType: req.tenant!.businessType });
});
