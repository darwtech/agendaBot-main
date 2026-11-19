import { Router } from 'express';
import { actorOf, requireAdmin } from '../../shared/auth.js';
import { notFound, parse, uuidParam } from '../../shared/http.js';
import * as repo from './customers.repository.js';
import { customerCreateSchema, customerPatchSchema } from './customers.schema.js';

export const customersRouter = Router();

customersRouter.get('/', requireAdmin, async (_req, res) => {
  res.json(await repo.listCustomers());
});

customersRouter.get('/:id', requireAdmin, async (req, res) => {
  const customer = await repo.findCustomer(parse(uuidParam, req.params.id));
  if (!customer) throw notFound('Cliente');
  res.json(customer);
});

// Público (el chat registra al cliente): si el contacto ya existe se devuelve sin modificarlo.
customersRouter.post('/', async (req, res) => {
  const { customer, created } = await repo.findOrCreateCustomer(
    parse(customerCreateSchema, req.body),
    actorOf(req)
  );
  res.status(created ? 201 : 200).json(customer);
});

customersRouter.patch('/:id', requireAdmin, async (req, res) => {
  const id = parse(uuidParam, req.params.id);
  const customer = await repo.updateCustomer(id, parse(customerPatchSchema, req.body), actorOf(req));
  if (!customer) throw notFound('Cliente');
  res.json(customer);
});

customersRouter.delete('/:id', requireAdmin, async (req, res) => {
  if (!(await repo.softDeleteCustomer(parse(uuidParam, req.params.id), actorOf(req)))) {
    throw notFound('Cliente');
  }
  res.status(204).end();
});
