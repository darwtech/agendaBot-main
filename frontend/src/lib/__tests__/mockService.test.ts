import { describe, expect, it } from 'vitest';
import { extractService } from '../ai/mock';

describe('extractService (intérprete local genérico)', () => {
  const barber = ['Corte clásico', 'Arreglo de barba', 'Corte + barba'];
  const spa = ['Masaje relajante', 'Masaje descontracturante', 'Limpieza facial'];
  const taller = ['Cambio de aceite', 'Revisión ITV', 'Alineación'];

  it('prefiere el nombre completo más largo', () => {
    expect(extractService('quiero corte + barba mañana', barber)).toBe('Corte + barba');
    expect(extractService('quiero un corte clasico', barber)).toBe('Corte clásico');
  });

  it('funciona con servicios de cualquier negocio', () => {
    expect(extractService('Quiero un masaje descontracturante el lunes', spa)).toBe('Masaje descontracturante');
    expect(extractService('me hace falta una limpieza de cara', spa)).toBe('Limpieza facial');
    expect(extractService('necesito cambiar el aceite del coche', taller)).toBe('Cambio de aceite');
  });

  it('no inventa servicio si no se menciona ninguno', () => {
    expect(extractService('¿hay hueco mañana a las 10?', spa)).toBeNull();
  });
});
