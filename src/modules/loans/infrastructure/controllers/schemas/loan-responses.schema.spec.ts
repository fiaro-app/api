import { describe, expect, it } from 'vitest';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';
import {
  toLoanResponse,
  toLoansPageResponse,
} from '@/modules/loans/infrastructure/controllers/schemas/loan-responses.schema.js';

const DETAILS: LoanDetails = {
  id: 'loan-1',
  clientId: 'client-1',
  principalAmount: 500_000,
  installmentCount: 20,
  installmentValue: 30_000,
  totalPayable: 600_000,
  frequency: 'DAILY',
  startDate: '2026-10-01',
  status: 'ACTIVE',
  createdByMembershipId: 'membership-1',
  createdAt: new Date('2026-09-30T00:00:00Z'),
  closedAt: null,
};

describe('toLoanResponse', () => {
  it('convierte la fecha de alta a texto ISO y deja closedAt en null', () => {
    expect(toLoanResponse(DETAILS)).toEqual({
      id: 'loan-1',
      clientId: 'client-1',
      principalAmount: 500_000,
      installmentCount: 20,
      installmentValue: 30_000,
      totalPayable: 600_000,
      frequency: 'DAILY',
      startDate: '2026-10-01',
      status: 'ACTIVE',
      createdByMembershipId: 'membership-1',
      createdAt: '2026-09-30T00:00:00.000Z',
      closedAt: null,
    });
  });

  it('convierte closedAt a texto ISO cuando el préstamo ya cerró', () => {
    const closed: LoanDetails = {
      ...DETAILS,
      status: 'CANCELED',
      closedAt: new Date('2026-09-30T12:00:00Z'),
    };

    expect(toLoanResponse(closed).closedAt).toBe('2026-09-30T12:00:00.000Z');
  });
});

describe('toLoansPageResponse', () => {
  it('envuelve los préstamos con sus metadatos de paginación', () => {
    expect(
      toLoansPageResponse(
        { items: [DETAILS], total: 1 },
        { page: 1, pageSize: 20 },
      ),
    ).toEqual({
      data: [toLoanResponse(DETAILS)],
      meta: { page: 1, pageSize: 20, total: 1 },
    });
  });
});
