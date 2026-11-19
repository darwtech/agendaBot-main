import { describe, expect, it } from 'vitest';
import { parseAndSanitizeAIIntent } from '../ai/schema';

describe('parseAndSanitizeAIIntent', () => {
  it('valida un JSON completo correcto', () => {
    const raw = JSON.stringify({
      intent: 'BOOK_APPOINTMENT',
      date: '2026-11-19',
      time: '17:30',
      service: 'Corte clásico',
      fullName: 'Miguel Ángel',
      contact: '611222333',
    });

    const res = parseAndSanitizeAIIntent(raw);
    expect(res.ok).toBe(true);
    expect(res.hadInvalidFields).toBe(false);
    expect(res.data).toEqual({
      intent: 'BOOK_APPOINTMENT',
      date: '2026-11-19',
      time: '17:30',
      service: 'Corte clásico',
      fullName: 'Miguel Ángel',
      contact: '611222333',
    });
  });

  it('pasa los campos inválidos a null y el intent inválido a OTHER', () => {
    const raw = `\`\`\`json
    {
      "intent": "INVENTADO",
      "date": "2026-02-31",
      "time": "25:99",
      "service": "",
      "fullName": 12345,
      "contact": "null"
    }
    \`\`\``;

    const res = parseAndSanitizeAIIntent(raw);
    expect(res.ok).toBe(true);
    expect(res.hadInvalidFields).toBe(true);
    expect(res.data).toEqual({
      intent: 'OTHER',
      date: null,
      time: null,
      service: null,
      fullName: null,
      contact: null,
    });
  });

  it('gestiona respuestas sin JSON sin lanzar excepciones', () => {
    const res = parseAndSanitizeAIIntent('Hola, no es json');
    expect(res.ok).toBe(false);
    expect(res.data.intent).toBe('OTHER');
    expect(res.data.date).toBeNull();
  });
});
