/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { Router } from 'express';
import { actorOf, isAdmin, requireAdmin } from '../../shared/auth.js';
import { notFound, parse, uuidParam } from '../../shared/http.js';
import { getSettings, getTimezone } from '../settings/settings.repository.js';
import { notifyCustomer } from '../whatsapp/whatsapp.service.js';
import { cancelledByBusinessText, rescheduledText } from './appointments.messages.js';
import * as repo from './appointments.repository.js';
import {
  appointmentCreateSchema,
  appointmentListQuery,
  appointmentPatchSchema,
} from './appointments.schema.js';
import { bookAppointment, updateAppointmentDetails } from './appointments.service.js';

export const appointmentsRouter = Router();

appointmentsRouter.get('/', async (req, res) => {
  const rows = await repo.listAppointments(await getTimezone(), parse(appointmentListQuery, req.query));
  if (isAdmin(req)) {
    res.json(rows);
    return;
  }
  // El chat público solo necesita la ocupación para calcular huecos: sin datos personales.
  res.json(
    rows
      .filter((a) => a.status === 'confirmed')
      .map((a) => ({
        ...a,
        customerId: '',
        customerName: '',
        customerContact: '',
        notes: null,
        cancelReason: null,
      }))
  );
});

appointmentsRouter.get('/:id', requireAdmin, async (req, res) => {
  const appointment = await repo.findAppointment(parse(uuidParam, req.params.id), await getTimezone());
  if (!appointment) throw notFound('Cita');
  res.json(appointment);
});

appointmentsRouter.post('/', async (req, res) => {
  const appointment = await bookAppointment(parse(appointmentCreateSchema, req.body), actorOf(req));
  res.status(201).json(appointment);
});

// Editar (reprogramar, notas) o cancelar con motivo. Si cambia algo que afecta al cliente, se le avisa por WhatsApp.
appointmentsRouter.patch('/:id', requireAdmin, async (req, res) => {
  const id = parse(uuidParam, req.params.id);
  const { before, after } = await updateAppointmentDetails(id, parse(appointmentPatchSchema, req.body), actorOf(req));
  const business = (await getSettings()).businessName ?? req.tenant!.name;
  const moved = before.date !== after.date || before.time !== after.time || before.serviceId !== after.serviceId;
  let text: string | null = null;
  if (after.status === 'cancelled' && before.status !== 'cancelled') {
    text = cancelledByBusinessText(after, after.cancelReason, business);
  } else if (after.status === 'confirmed' && moved) {
    text = rescheduledText(before, after, business);
  }
  const notified = text
    ? await notifyCustomer(req.tenant!.slug, after.customerContact ?? '', text).catch((err) => {
        console.error(`[whatsapp:${req.tenant!.slug}] No se pudo avisar al cliente:`, err);
        return false;
      })
    : undefined;
  res.json({ ...after, notified });
});

appointmentsRouter.delete('/:id', requireAdmin, async (req, res) => {
  if (!(await repo.softDeleteAppointment(parse(uuidParam, req.params.id), actorOf(req)))) {
    throw notFound('Cita');
  }
  res.status(204).end();
});
