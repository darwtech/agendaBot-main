/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, buildUrl } from '../api/client';

afterEach(() => vi.restoreAllMocks());

describe('api client', () => {
  it('construye la URL con query y omite valores vacíos', () => {
    expect(buildUrl('/availability', { date: '2026-01-01', x: undefined })).toBe(
      '/api/availability?date=2026-01-01'
    );
  });

  it('envía JSON y devuelve la respuesta parseada', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ id: '1' }), { status: 201 }));
    await expect(api.post('/services', { name: 'Corte' })).resolves.toEqual({ id: '1' });
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.body).toBe('{"name":"Corte"}');
  });

  it('lanza ApiError con el mensaje del backend', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'No encontrado' }), { status: 404 })
    );
    await expect(api.get('/x')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'No encontrado',
    } satisfies Partial<ApiError>);
  });
});
