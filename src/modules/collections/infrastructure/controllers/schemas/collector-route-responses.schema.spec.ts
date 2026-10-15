import { describe, expect, it } from 'vitest';
import type { CollectorRouteEntry } from '@/modules/collections/application/dtos/collector-route-entry.dto.js';
import { toCollectorRouteResponse } from '@/modules/collections/infrastructure/controllers/schemas/collector-route-responses.schema.js';

const ENTRY: CollectorRouteEntry = {
  loanId: 'loan-1',
  clientId: 'client-1',
  clientFullName: 'Carlos Deudor',
  balance: 50_000,
  overdueAmount: 10_000,
  overdueDays: 2,
  nextDueDate: '2026-10-03',
  collectedToday: 0,
};

describe('toCollectorRouteResponse', () => {
  it('convierte cada fila de la ruta', () => {
    expect(toCollectorRouteResponse([ENTRY])).toEqual([
      {
        loanId: 'loan-1',
        clientId: 'client-1',
        clientFullName: 'Carlos Deudor',
        balance: 50_000,
        overdueAmount: 10_000,
        overdueDays: 2,
        nextDueDate: '2026-10-03',
        collectedToday: 0,
      },
    ]);
  });

  it('con una ruta vacía, devuelve una lista vacía', () => {
    expect(toCollectorRouteResponse([])).toEqual([]);
  });
});
