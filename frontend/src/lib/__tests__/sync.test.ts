/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { describe, expect, it } from 'vitest';
import { diffById } from '../api/sync';

describe('diffById', () => {
  it('detecta altas y cambios por campo, e ignora bajas', () => {
    const a = { id: 'a', name: 'Corte', price: 10 };
    const b = { id: 'b', name: 'Barba', price: 8 };
    const prev = [a, b];
    const next = [{ ...a, price: 12 }, { id: 'c', name: 'Tinte', price: 20 }];
    expect(diffById(prev, next)).toEqual({
      created: [{ id: 'c', name: 'Tinte', price: 20 }],
      updated: [{ id: 'a', patch: { price: 12 } }],
    });
  });

  it('no genera nada si la referencia no cambia', () => {
    const items = [{ id: 'a', n: 1 }];
    expect(diffById(items, [items[0]])).toEqual({ created: [], updated: [] });
  });
});
