import { Router } from 'express';
import { actorOf, isAdmin, requireAdmin } from '../../shared/auth.js';
import { notFound, parse, uuidParam } from '../../shared/http.js';
import * as repo from './services.repository.js';
import { serviceCreateSchema, servicePatchSchema } from './services.schema.js';

export const servicesRouter = Router();

// El público solo ve los servicios activos; el panel los ve todos.
servicesRouter.get('/', async (req, res) => {
  res.json(await repo.listServices(!isAdmin(req)));
});

servicesRouter.get('/:id', async (req, res) => {
  const service = await repo.findService(parse(uuidParam, req.params.id));
  if (!service) throw notFound('Servicio');
  res.json(service);
});

servicesRouter.post('/', requireAdmin, async (req, res) => {
  const data = parse(serviceCreateSchema, req.body);
  res.status(201).json(await repo.createService(data, actorOf(req)));
});

servicesRouter.patch('/:id', requireAdmin, async (req, res) => {
  const id = parse(uuidParam, req.params.id);
  const service = await repo.updateService(id, parse(servicePatchSchema, req.body), actorOf(req));
  if (!service) throw notFound('Servicio');
  res.json(service);
});

servicesRouter.delete('/:id', requireAdmin, async (req, res) => {
  if (!(await repo.softDeleteService(parse(uuidParam, req.params.id), actorOf(req)))) {
    throw notFound('Servicio');
  }
  res.status(204).end();
});
