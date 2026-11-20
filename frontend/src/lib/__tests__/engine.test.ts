/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { describe, expect, it } from 'vitest';
import {
  createDefaultProviders,
  createDefaultSchedule,
  createDefaultServices,
  createDefaultSettings,
  createEmptyDraft,
} from '../../store/seed';
import type { Appointment, ChatMessageItem, Customer } from '../../store/types';
import { bookAppointmentPure } from '../booking/slots';
import { detectConfirmationAnswer, processChatTurn, type EngineEnvironment } from '../chat/engine';

function makeEnv(now: Date): {
  env: EngineEnvironment;
  appointments: Appointment[];
  customers: Customer[];
} {
  const appointments: Appointment[] = [];
  const customers: Customer[] = [];
  const services = createDefaultServices();
  const schedule = createDefaultSchedule();
  const settings = createDefaultSettings();

  const env: EngineEnvironment = {
    settings,
    activeProviderId: 'mock',
    providers: createDefaultProviders(),
    services,
    schedule,
    appointments,
    customers,
    onBookAppointment: (input) => {
      const res = bookAppointmentPure(input, {
        services,
        schedule,
        appointments,
        customers,
        timezone: settings.timezone,
        slotInterval: settings.slotInterval,
        now,
      });
      if (res.ok) {
        appointments.push(res.appointment);
        if (res.isNewCustomer) customers.push(res.customer);
      }
      return res;
    },
  };

  return { env, appointments, customers };
}

describe('detectConfirmationAnswer', () => {
  it('reconoce "sí" con tilde sin fallar por \\b', () => {
    expect(detectConfirmationAnswer('sí')).toBe('yes');
    expect(detectConfirmationAnswer('Sí, claro')).toBe('yes');
    expect(detectConfirmationAnswer('si')).toBe('yes');
    expect(detectConfirmationAnswer('no')).toBe('no');
    expect(detectConfirmationAnswer('No, mejor otro día')).toBe('no');
  });
});

describe('processChatTurn con proveedor demo', () => {
  it('completa el flujo de reserva paso a paso y confirma con "sí" sin IA', async () => {
    // Tuesday 2026-11-17 09:00 UTC -> tomorrow is Wednesday 2026-11-18
    const now = new Date('2026-11-17T09:00:00Z');
    const { env, appointments } = makeEnv(now);

    let draft = createEmptyDraft();
    const history: ChatMessageItem[] = [];

    const runStep = async (userMessage: string) => {
      const result = await processChatTurn(
        { userMessage, history, draft, channel: 'web', now },
        env
      );
      history.push({
        id: `u-${history.length}`,
        role: 'user',
        content: userMessage,
        timestamp: now.toISOString(),
      });
      history.push({
        id: `a-${history.length}`,
        role: 'assistant',
        content: result.reply,
        timestamp: now.toISOString(),
      });
      draft = result.updatedDraft;
      return result;
    };

    // 1. User asks to book classic cut tomorrow
    const r1 = await runStep('Quiero reservar corte clásico mañana');
    expect(r1.isError).toBe(false);
    expect(r1.updatedDraft.serviceId).toBe('srv-corte-clasico');
    expect(r1.updatedDraft.date).toBe('2026-11-18');
    expect(r1.suggestedSlots?.length).toBeGreaterThan(0);

    // 2. User picks 11:00
    const r2 = await runStep('A las 11:00');
    expect(r2.updatedDraft.time).toBe('11:00');
    expect(r2.reply).toMatch(/nombre/i);

    // 3. User gives full name
    const r3 = await runStep('Carlos Gómez');
    expect(r3.updatedDraft.fullName).toBe('Carlos Gómez');
    expect(r3.reply).toMatch(/teléfono|correo/i);

    // 4. User gives contact -> summary + confirmation request
    const r4 = await runStep('612345678');
    expect(r4.isConfirmationPrompt).toBe(true);
    expect(r4.updatedDraft.awaitingConfirmation).toBe(true);
    expect(r4.reply).toContain('Carlos Gómez');
    expect(appointments).toHaveLength(0);

    // 5. User confirms with "sí" -> resolved without AI and saves appointment
    const r5 = await runStep('sí');
    expect(r5.resolvedWithoutAI).toBe(true);
    expect(r5.reply).toContain('✅ Cita confirmada');
    expect(r5.bookedAppointment).toBeDefined();
    expect(appointments).toHaveLength(1);
    expect(appointments[0].time).toBe('11:00');
    expect(appointments[0].date).toBe('2026-11-18');
  });

  it('ofrece alternativas cuando la hora pedida ya está ocupada', async () => {
    const now = new Date('2026-11-17T09:00:00Z');
    const { env, appointments } = makeEnv(now);

    appointments.push({
      id: 'existing-1',
      customerId: 'c1',
      customerName: 'Previo',
      customerContact: '600000000',
      serviceId: 'srv-corte-clasico',
      serviceName: 'Corte clásico',
      price: 15,
      durationMinutes: 30,
      date: '2026-11-18',
      time: '10:00',
      status: 'confirmed',
      channel: 'web',
      createdAt: now.toISOString(),
    });

    const result = await processChatTurn(
      {
        userMessage: 'Quiero corte clásico mañana a las 10:00',
        history: [],
        draft: createEmptyDraft(),
        now,
      },
      env
    );

    expect(result.reply).toMatch(/ocupada|fuera de horario/i);
    expect(result.suggestedSlots).toBeDefined();
    expect(result.suggestedSlots).not.toContain('10:00');
    expect(result.suggestedSlots).toContain('10:30');
  });
});
