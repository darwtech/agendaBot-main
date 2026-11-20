/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { Router } from 'express';
import { actorOf, requireAdmin } from '../../shared/auth.js';
import { parse } from '../../shared/http.js';
import { getSchedule, replaceSchedule } from './schedule.repository.js';
import { scheduleSchema } from './schedule.schema.js';

export const scheduleRouter = Router();

scheduleRouter.get('/', async (_req, res) => {
  res.json(await getSchedule());
});

scheduleRouter.put('/', requireAdmin, async (req, res) => {
  res.json(await replaceSchedule(parse(scheduleSchema, req.body), actorOf(req)));
});
