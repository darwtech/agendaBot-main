import { describe, expect, it } from 'vitest';
import { bookAppointmentPure, getAvailableSlots } from '../booking/slots';
import { createDefaultSchedule, createDefaultServices } from '../../store/seed';
import type { Appointment, Customer } from '../../store/types';

const services = createDefaultServices();
const schedule = createDefaultSchedule();
const classicId = 'srv-corte-clasico'; // 30 min
const comboId = 'srv-corte-barba'; // 60 min

describe('getAvailableSlots', () => {
  it('respeta el cierre de mediodía (14:00-16:00) y duración del servicio', () => {
    // 2026-11-18 is a Wednesday (Miércoles)
    const now = new Date('2026-11-17T09:00:00Z');
    const slots30 = getAvailableSlots('2026-11-18', classicId, {
      services,
      schedule,
      appointments: [],
      timezone: 'Europe/Madrid',
      slotInterval: 30,
      now,
    });

    // Morning: 10:00..13:30 (14:00 is closed). Afternoon: 16:00..19:30 (20:00 closed)
    expect(slots30).toContain('13:30');
    expect(slots30).not.toContain('14:00');
    expect(slots30).not.toContain('14:30');
    expect(slots30).not.toContain('15:30');
    expect(slots30).toContain('16:00');
    expect(slots30).toContain('19:30');
    expect(slots30).not.toContain('20:00');

    // 60 min service cannot start at 13:30 because 13:30+60 = 14:30 > 14:00
    const slots60 = getAvailableSlots('2026-11-18', comboId, {
      services,
      schedule,
      appointments: [],
      timezone: 'Europe/Madrid',
      slotInterval: 30,
      now,
    });
    expect(slots60).toContain('13:00');
    expect(slots60).not.toContain('13:30');
    expect(slots60).toContain('19:00');
    expect(slots60).not.toContain('19:30');
  });

  it('no ofrece horas pasadas en el día actual ni días anteriores (Europe/Madrid)', () => {
    // 2026-11-18 11:15 UTC = 12:15 CET (Europe/Madrid in November is UTC+1)
    const now = new Date('2026-11-18T11:15:00Z');

    const pastDaySlots = getAvailableSlots('2026-11-17', classicId, {
      services,
      schedule,
      appointments: [],
      timezone: 'Europe/Madrid',
      slotInterval: 30,
      now,
    });
    expect(pastDaySlots).toEqual([]);

    const todaySlots = getAvailableSlots('2026-11-18', classicId, {
      services,
      schedule,
      appointments: [],
      timezone: 'Europe/Madrid',
      slotInterval: 30,
      now,
    });

    expect(todaySlots).not.toContain('10:00');
    expect(todaySlots).not.toContain('12:00');
    expect(todaySlots[0]).toBe('12:30');
  });

  it('no solapa citas confirmadas pero libera franjas canceladas', () => {
    const now = new Date('2026-11-17T08:00:00Z');
    const appointments: Appointment[] = [
      {
        id: 'a1',
        customerId: 'c1',
        customerName: 'Ana',
        customerContact: '600111222',
        serviceId: comboId,
        serviceName: 'Corte + barba',
        price: 22,
        durationMinutes: 60,
        date: '2026-11-18',
        time: '10:30',
        status: 'confirmed',
        channel: 'web',
        createdAt: now.toISOString(),
      },
      {
        id: 'a2',
        customerId: 'c2',
        customerName: 'Luis',
        customerContact: '600333444',
        serviceId: classicId,
        serviceName: 'Corte clásico',
        price: 15,
        durationMinutes: 30,
        date: '2026-11-18',
        time: '16:00',
        status: 'cancelled',
        channel: 'web',
        createdAt: now.toISOString(),
      },
    ];

    const slots30 = getAvailableSlots('2026-11-18', classicId, {
      services,
      schedule,
      appointments,
      timezone: 'Europe/Madrid',
      slotInterval: 30,
      now,
    });

    // 10:30-11:30 confirmed blocks 10:30 and 11:00; 10:00 (10:00-10:30) and 11:30 remain free
    expect(slots30).toContain('10:00');
    expect(slots30).not.toContain('10:30');
    expect(slots30).not.toContain('11:00');
    expect(slots30).toContain('11:30');

    // Cancelled appointment at 16:00 does NOT block 16:00
    expect(slots30).toContain('16:00');

    // A 60m service at 10:00 would overlap 10:30-11:30, so 10:00 must be blocked for 60m
    const slots60 = getAvailableSlots('2026-11-18', comboId, {
      services,
      schedule,
      appointments,
      timezone: 'Europe/Madrid',
      slotInterval: 30,
      now,
    });
    expect(slots60).not.toContain('10:00');
    expect(slots60).toContain('11:30');
  });

  it('devuelve vacío en domingo cerrado', () => {
    // 2026-11-22 is Sunday
    const now = new Date('2026-11-17T08:00:00Z');
    const sundaySlots = getAvailableSlots('2026-11-22', classicId, {
      services,
      schedule,
      appointments: [],
      timezone: 'Europe/Madrid',
      slotInterval: 30,
      now,
    });
    expect(sundaySlots).toEqual([]);
  });
});

describe('bookAppointmentPure', () => {
  it('reserva correctamente y rechaza duplicados/solapamientos en el mismo hueco', () => {
    const now = new Date('2026-11-17T08:00:00Z');
    const customers: Customer[] = [];
    const appointments: Appointment[] = [];

    const first = bookAppointmentPure(
      {
        serviceId: comboId,
        date: '2026-11-18',
        time: '11:00',
        fullName: 'Carlos Pérez',
        contact: '612345678',
        channel: 'web',
      },
      {
        services,
        schedule,
        appointments,
        customers,
        timezone: 'Europe/Madrid',
        slotInterval: 30,
        now,
      }
    );

    expect(first.ok).toBe(true);
    if (!first.ok) return;

    appointments.push(first.appointment);
    customers.push(first.customer);

    // Exact duplicate at 11:00
    const duplicate = bookAppointmentPure(
      {
        serviceId: classicId,
        date: '2026-11-18',
        time: '11:00',
        fullName: 'Otro Cliente',
        contact: '699999999',
      },
      {
        services,
        schedule,
        appointments,
        customers,
        timezone: 'Europe/Madrid',
        slotInterval: 30,
        now,
      }
    );

    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) {
      expect(duplicate.reason).toBe('SLOT_UNAVAILABLE');
      expect(duplicate.alternatives).not.toContain('11:00');
      expect(duplicate.alternatives).not.toContain('11:30');
      expect(duplicate.alternatives).toContain('12:00');
    }

    // Overlapping 11:30 (since 11:00 combo runs 11:00..12:00)
    const overlapping = bookAppointmentPure(
      {
        serviceId: classicId,
        date: '2026-11-18',
        time: '11:30',
        fullName: 'Tercer Cliente',
        contact: '688888888',
      },
      {
        services,
        schedule,
        appointments,
        customers,
        timezone: 'Europe/Madrid',
        slotInterval: 30,
        now,
      }
    );
    expect(overlapping.ok).toBe(false);
  });
});
