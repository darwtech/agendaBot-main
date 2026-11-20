/**
 * HopperSoft — Creador: Darwin Chavez
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { senderPhone } from '../whatsapp/whatsapp.service.js';
import { buildSystemPrompt, parseAssistantJson, welcomeText } from './assistant.service.js';

const SERVICE_ID = '7d3c0f1e-4a2b-4c5d-8e9f-0a1b2c3d4e5f';

test('parseAssistantJson lee la respuesta, la reserva y tolera texto libre', () => {
  assert.deepEqual(parseAssistantJson('{"reply":"Hola","book":null}'), { reply: 'Hola', book: null, cancel: null });
  const booked = parseAssistantJson(
    `Claro: {"reply":"Listo","book":{"serviceId":"${SERVICE_ID}","date":"2026-11-20","time":"10:30","fullName":"Ana Pérez"}}`
  );
  assert.equal(booked.book?.time, '10:30');
  assert.deepEqual(parseAssistantJson('Hola, ¿en qué te ayudo?'), { reply: 'Hola, ¿en qué te ayudo?', book: null, cancel: null });
  // Reserva con datos inválidos: no se reserva, pero se responde el texto bruto.
  assert.equal(parseAssistantJson('{"reply":"x","book":{"serviceId":"no","date":"mañana","time":"10","fullName":"A"}}').book, null);
  const cancel = parseAssistantJson(`{"reply":"ok","book":null,"cancel":{"appointmentId":"${SERVICE_ID}","reason":"Estoy enfermo"}}`);
  assert.equal(cancel.cancel?.reason, 'Estoy enfermo');
});

test('senderPhone usa el JID de teléfono aunque el chat venga por LID', () => {
  assert.equal(senderPhone('34600111222@s.whatsapp.net'), '34600111222');
  assert.equal(senderPhone('123456789@lid', '34600111222:3@s.whatsapp.net'), '34600111222');
  assert.equal(senderPhone('123456789@lid'), null);
});

test('buildSystemPrompt incluye servicios, horario y citas ocupadas', () => {
  const prompt = buildSystemPrompt({
    settings: {
      businessName: 'Spa Luna',
      currency: 'EUR',
      slotInterval: 30,
      maxSlotsShown: 4,
      address: 'Calle Mayor 1',
      businessInfo: 'Aceptamos Bizum.',
      systemPrompt: 'Devuelve el JSON de intención',
    },
    businessType: 'spa',
    welcomeSent: '¡Hola!',
    tz: 'Europe/Madrid',
    services: [{ id: SERVICE_ID, name: 'Masaje', durationMinutes: 60, price: 40, description: '' }],
    schedule: [{ dayOfWeek: 1, closed: false, blocks: [{ start: '09:00', end: '14:00' }] }],
    freeSlots: [{ serviceId: SERVICE_ID, days: [{ date: '2026-11-23', times: ['09:00', '09:30'] }] }],
    customerAppointments: [
      {
        id: SERVICE_ID,
        serviceId: SERVICE_ID,
        serviceName: 'Masaje',
        customerName: 'Ana Pérez',
        customerContact: '593981949350',
        date: '2026-11-20',
        time: '10:00',
        durationMinutes: 60,
        price: 40,
        status: 'confirmed',
        cancelReason: null,
      },
    ],
  });
  assert.match(prompt, /Spa Luna/);
  assert.match(prompt, new RegExp(SERVICE_ID));
  assert.match(prompt, /lunes: 09:00-14:00/);
  assert.match(prompt, /lunes 2026-11-23: 09:00, 09:30/);
  assert.match(prompt, /Masaje, viernes 20\/11 a las 10:00 \| \$40 USD \| a nombre de Ana Pérez/);
  assert.match(prompt, /Calle Mayor 1/);
  assert.match(prompt, /Aceptamos Bizum/);
  assert.match(prompt, /máximo 4 horas/);
  assert.match(prompt, /, spa\./);
  assert.match(prompt, /no vuelvas a saludar/);
  // El prompt del chat web (otro formato de JSON) no debe colarse aquí.
  assert.doesNotMatch(prompt, /JSON de intención/);
});

test('welcomeText usa el mensaje configurado o el de por defecto', () => {
  assert.equal(welcomeText({ welcomeMessage: 'Hola, soy {{negocio}}', businessName: 'Spa Luna' }, 'x'), 'Hola, soy Spa Luna');
  assert.match(welcomeText({ welcomeMessage: '  ' }, 'Spa Luna'), /Bienvenido\/a a Spa Luna/);
});

test('retryDelayMs usa la espera que pide el proveedor, con límites', async () => {
  const { retryDelayMs } = await import('./ai.js');
  assert.equal(retryDelayMs('Please try again in 2.37s.', null), 2370);
  assert.equal(retryDelayMs('', '5'), 5000);
  assert.equal(retryDelayMs('sin pista', null), 2000);
  assert.equal(retryDelayMs('try again in 90s', null), 15000);
});

test('isGreetingOnly distingue un saludo de una pregunta', async () => {
  const { isGreetingOnly } = await import('./assistant.service.js');
  for (const t of ['Hola', 'hola!!', 'Buenas tardes 👋', 'Holaaa', 'hola, buenos días', 'Qué tal']) assert.ok(isGreetingOnly(t), t);
  for (const t of ['Hola, quiero una cita', 'hola\nprecio de uñas?', '¿Tenéis hueco mañana?']) assert.ok(!isGreetingOnly(t), t);
});
