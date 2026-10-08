import { describe, expect, it } from 'vitest';
import type { LenderDashboard } from '@/modules/dashboard/application/dtos/lender-dashboard.dto.js';
import { toLenderDashboardResponse } from '@/modules/dashboard/infrastructure/controllers/schemas/lender-dashboard-responses.schema.js';

describe('toLenderDashboardResponse', () => {
  it('convierte el resumen, incluyendo cada cuadre pendiente', () => {
    const dashboard: LenderDashboard = {
      totalPortfolio: 1_000_000,
      collectedToday: 50_000,
      activeCollectors: 2,
      totalCollectors: 3,
      effectivenessToday: 0.5,
      clientsInArrears: 1,
      alerts: ['1 cobrador aún no ha iniciado su ruta hoy.'],
      pendingSettlements: [
        {
          id: 'settlement-1',
          collectorMembershipId: 'membership-1',
          date: '2026-10-07',
          expectedAmount: 50_000,
          collectedAmount: 30_000,
          collectedCash: 30_000,
          collectedNequi: 0,
          collectedTransfer: 0,
          status: 'PENDING',
          collectorNote: 'Cliente pidió plazo.',
          reviewNote: null,
          reviewedByMembershipId: null,
          reviewedAt: null,
          submittedAt: new Date('2026-10-07T20:00:00Z'),
          createdAt: new Date('2026-10-07T20:00:00Z'),
        },
      ],
    };

    expect(toLenderDashboardResponse(dashboard)).toEqual({
      totalPortfolio: 1_000_000,
      collectedToday: 50_000,
      activeCollectors: 2,
      totalCollectors: 3,
      effectivenessToday: 0.5,
      clientsInArrears: 1,
      alerts: ['1 cobrador aún no ha iniciado su ruta hoy.'],
      pendingSettlements: [
        {
          id: 'settlement-1',
          collectorMembershipId: 'membership-1',
          date: '2026-10-07',
          expectedAmount: 50_000,
          collectedAmount: 30_000,
          collectedByMethod: { CASH: 30_000, NEQUI: 0, TRANSFER: 0 },
          status: 'PENDING',
          collectorNote: 'Cliente pidió plazo.',
        },
      ],
    });
  });

  it('sin cuadres pendientes, devuelve la lista vacía', () => {
    const dashboard: LenderDashboard = {
      totalPortfolio: 0,
      collectedToday: 0,
      activeCollectors: 0,
      totalCollectors: 0,
      effectivenessToday: null,
      clientsInArrears: 0,
      alerts: [],
      pendingSettlements: [],
    };

    expect(toLenderDashboardResponse(dashboard).pendingSettlements).toEqual([]);
  });
});
