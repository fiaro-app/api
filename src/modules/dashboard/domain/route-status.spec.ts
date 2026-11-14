import { describe, expect, it } from 'vitest';
import {
  routeStatus,
  routeStatusOrder,
} from '@/modules/dashboard/domain/route-status.js';

describe('routeStatus', () => {
  it('sin préstamos en la ruta no hay ruta', () => {
    expect(routeStatus(0, 0, 0)).toBe('NO_ROUTE');
  });

  it('sin ninguna visita, aún no empieza', () => {
    expect(routeStatus(5, 0, 0)).toBe('NOT_STARTED');
  });

  it('con visitas y préstamos pendientes, va en marcha', () => {
    expect(routeStatus(5, 2, 3)).toBe('IN_PROGRESS');
  });

  it('con una visita fuera de ruta pero ninguna dentro, va en marcha', () => {
    expect(routeStatus(5, 0, 1)).toBe('IN_PROGRESS');
  });

  it('con todos visitados, terminó', () => {
    expect(routeStatus(5, 5, 6)).toBe('FINISHED');
  });

  it('lista primero a quien no empezó y al final a quien no tiene ruta', () => {
    const order = (
      ['NO_ROUTE', 'FINISHED', 'IN_PROGRESS', 'NOT_STARTED'] as const
    ).toSorted((a, b) => routeStatusOrder(a) - routeStatusOrder(b));
    expect(order).toEqual([
      'NOT_STARTED',
      'IN_PROGRESS',
      'FINISHED',
      'NO_ROUTE',
    ]);
  });
});
