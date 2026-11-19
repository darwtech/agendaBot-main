import { tenantTransaction } from '../../db/pool.js';
import { HttpError, notFound } from '../../shared/http.js';
import { findOrCreateCustomer } from '../customers/customers.repository.js';
import { findService } from '../services/services.repository.js';
import { getTimezone } from '../settings/settings.repository.js';
import * as repo from './appointments.repository.js';
import type { AppointmentCreate, AppointmentPatch } from './appointments.schema.js';

/**
 * Reserva una cita: valida servicio, horario de apertura y que no sea en el pasado.
 * El solapamiento lo impide la restricción appointments_no_overlap (devuelve 409).
 */
export async function bookAppointment(input: AppointmentCreate, actor: string | null) {
  return tenantTransaction(async (db) => {
    const service = await findService(input.serviceId, db);
    if (!service || !service.active) throw notFound('Servicio');

    if (!(await repo.isWithinBusinessHours(db, input.date, input.time, service.durationMinutes))) {
      throw new HttpError(409, 'La hora está fuera del horario de apertura');
    }

    const { customer } = await findOrCreateCustomer(
      { fullName: input.customerName, contact: input.customerContact },
      actor,
      db
    );
    const tz = await getTimezone(db);
    const { id, inPast } = await repo.insertAppointment(db, {
      id: input.id,
      customerId: customer.id,
      serviceId: service.id,
      date: input.date,
      time: input.time,
      durationMinutes: service.durationMinutes,
      channel: input.channel,
      notes: input.notes,
      tz,
      actor,
    });
    // Se lanza tras insertar para usar la hora del servidor de BD; el rollback deshace la fila.
    if (inPast) throw new HttpError(409, 'No se pueden reservar citas en el pasado');
    return repo.findAppointment(id, tz, db);
  });
}

/**
 * Edita una cita: reprogramar (servicio/fecha/hora, con las mismas validaciones que al reservar),
 * cancelar con motivo, reactivar o cambiar notas. Devuelve la cita antes y después del cambio.
 */
export async function updateAppointmentDetails(id: string, patch: AppointmentPatch, actor: string | null) {
  return tenantTransaction(async (db) => {
    const tz = await getTimezone(db);
    const before = await repo.findAppointment(id, tz, db);
    if (!before) throw notFound('Cita');

    if (patch.serviceId || patch.date || patch.time) {
      const service = await findService(patch.serviceId ?? before.serviceId, db);
      if (!service || !service.active) throw notFound('Servicio');
      const date = patch.date ?? before.date;
      const time = patch.time ?? before.time;
      if (!(await repo.isWithinBusinessHours(db, date, time, service.durationMinutes))) {
        throw new HttpError(409, 'La hora está fuera del horario de apertura');
      }
      const moved = await repo.moveAppointment(db, {
        id,
        serviceId: service.id,
        date,
        time,
        durationMinutes: service.durationMinutes,
        tz,
        actor,
      });
      if (moved?.inPast) throw new HttpError(409, 'No se puede mover una cita al pasado');
    }
    if (patch.status === 'cancelled' && before.status === 'cancelled') {
      throw new HttpError(409, 'La cita ya estaba cancelada');
    }
    if (patch.status || patch.notes !== undefined || patch.cancelReason) {
      await repo.updateAppointment(id, patch, actor, db);
    }
    return { before, after: await repo.findAppointment(id, tz, db) };
  });
}
