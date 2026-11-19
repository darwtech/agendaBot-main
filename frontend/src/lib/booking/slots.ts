import type {
  Appointment,
  ChannelType,
  Customer,
  DaySchedule,
  ServiceItem,
  SlotInterval,
} from '../../store/types';
import {
  addDaysToDateStr,
  getNowPartsInTimezone,
  getWeekdayFromDateStr,
  isValidDateStr,
  isValidTimeStr,
  minutesToTime,
  timeToMinutes,
} from './timezone';

export interface BookingContext {
  services: ServiceItem[];
  schedule: DaySchedule[];
  appointments: Appointment[];
  timezone: string;
  slotInterval: SlotInterval;
  now?: Date;
}

export function getAvailableSlots(
  date: string,
  serviceId: string,
  context: BookingContext
): string[] {
  if (!isValidDateStr(date)) return [];

  const service = context.services.find((s) => s.id === serviceId && s.active);
  if (!service || service.durationMinutes <= 0) return [];

  const { dateStr: todayStr, minutesOfDay: nowMinutes } = getNowPartsInTimezone(
    context.timezone,
    context.now
  );

  // Never offer slots on past dates
  if (date < todayStr) return [];

  const dow = getWeekdayFromDateStr(date);
  const daySchedule = context.schedule.find((d) => d.dayOfWeek === dow);
  if (!daySchedule || daySchedule.closed || daySchedule.blocks.length === 0) {
    return [];
  }

  const confirmedOnDate = context.appointments
    .filter((a) => a.date === date && a.status === 'confirmed')
    .map((a) => {
      const start = timeToMinutes(a.time);
      return { start, end: start + a.durationMinutes };
    });

  const step = context.slotInterval || 30;
  const duration = service.durationMinutes;
  const slots = new Set<string>();

  const sortedBlocks = [...daySchedule.blocks].sort(
    (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)
  );

  for (const block of sortedBlocks) {
    if (!isValidTimeStr(block.start) || !isValidTimeStr(block.end)) continue;
    const blockStart = timeToMinutes(block.start);
    const blockEnd = timeToMinutes(block.end);
    if (blockEnd <= blockStart) continue;

    for (
      let candidateStart = blockStart;
      candidateStart + duration <= blockEnd;
      candidateStart += step
    ) {
      // Never offer past times on today's date
      if (date === todayStr && candidateStart <= nowMinutes) {
        continue;
      }

      const candidateEnd = candidateStart + duration;
      const overlaps = confirmedOnDate.some(
        (appt) => candidateStart < appt.end && candidateEnd > appt.start
      );

      if (!overlaps) {
        slots.add(minutesToTime(candidateStart));
      }
    }
  }

  return Array.from(slots).sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
}

export function findNextAvailableDates(
  fromDate: string,
  serviceId: string,
  context: BookingContext,
  daysToScan: number = 14,
  limit: number = 3
): Array<{ date: string; slots: string[] }> {
  const results: Array<{ date: string; slots: string[] }> = [];
  for (let i = 0; i < daysToScan && results.length < limit; i++) {
    const candidateDate = addDaysToDateStr(fromDate, i);
    const slots = getAvailableSlots(candidateDate, serviceId, context);
    if (slots.length > 0) {
      results.push({ date: candidateDate, slots });
    }
  }
  return results;
}

export interface BookAppointmentInput {
  serviceId: string;
  date: string;
  time: string;
  fullName: string;
  contact: string;
  channel?: ChannelType;
  notes?: string;
}

export type BookAppointmentResult =
  | {
      ok: true;
      appointment: Appointment;
      customer: Customer;
      isNewCustomer: boolean;
    }
  | {
      ok: false;
      reason:
        | 'INVALID_SERVICE'
        | 'INVALID_DATE_OR_TIME'
        | 'MISSING_CUSTOMER_INFO'
        | 'SLOT_UNAVAILABLE';
      message: string;
      alternatives: string[];
    };

export function bookAppointmentPure(
  input: BookAppointmentInput,
  context: BookingContext & { customers: Customer[] }
): BookAppointmentResult {
  const service = context.services.find((s) => s.id === input.serviceId && s.active);
  if (!service) {
    return {
      ok: false,
      reason: 'INVALID_SERVICE',
      message: 'El servicio seleccionado no está disponible.',
      alternatives: [],
    };
  }

  if (!isValidDateStr(input.date) || !isValidTimeStr(input.time)) {
    return {
      ok: false,
      reason: 'INVALID_DATE_OR_TIME',
      message: 'La fecha o la hora indicadas no son válidas.',
      alternatives: [],
    };
  }

  const fullName = input.fullName.trim();
  const contact = input.contact.trim();
  if (!fullName || !contact) {
    return {
      ok: false,
      reason: 'MISSING_CUSTOMER_INFO',
      message: 'El nombre completo y el contacto son obligatorios.',
      alternatives: [],
    };
  }

  // Re-verify slot availability right before saving
  const availableSlots = getAvailableSlots(input.date, input.serviceId, context);
  if (!availableSlots.includes(input.time)) {
    return {
      ok: false,
      reason: 'SLOT_UNAVAILABLE',
      message: `La franja de las ${input.time} el ${input.date} ya no está disponible.`,
      alternatives: availableSlots,
    };
  }

  const nowIso = (context.now ?? new Date()).toISOString();
  const normalizedContact = contact.toLowerCase().replace(/\s+/g, '');

  const existingCustomer = context.customers.find(
    (c) => c.contact.toLowerCase().replace(/\s+/g, '') === normalizedContact
  );

  const customer: Customer = existingCustomer
    ? { ...existingCustomer, fullName }
    : {
        id: crypto.randomUUID(),
        fullName,
        contact,
        createdAt: nowIso,
      };

  const appointment: Appointment = {
    id: crypto.randomUUID(),
    customerId: customer.id,
    customerName: customer.fullName,
    customerContact: customer.contact,
    serviceId: service.id,
    serviceName: service.name,
    price: service.price,
    durationMinutes: service.durationMinutes,
    date: input.date,
    time: input.time,
    status: 'confirmed',
    channel: input.channel ?? 'web',
    notes: input.notes?.trim() || undefined,
    createdAt: nowIso,
  };

  return {
    ok: true,
    appointment,
    customer,
    isNewCustomer: !existingCustomer,
  };
}
