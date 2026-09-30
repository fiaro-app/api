import { describe, expect, it } from 'vitest';
import { toLoanDetails } from '@/modules/loans/application/dtos/loan-details.mapper.js';
import { Loan } from '@/modules/loans/domain/entities/loan.entity.js';

describe('toLoanDetails', () => {
  it('devuelve los datos públicos del préstamo', () => {
    const createdAt = new Date('2026-09-30T00:00:00Z');
    const loan = Loan.create({
      id: 'loan-1',
      lenderId: 'lender-1',
      clientId: 'client-1',
      principalAmount: 500_000,
      installmentCount: 20,
      installmentValue: 30_000,
      totalPayable: 600_000,
      frequency: 'DAILY',
      startDate: '2026-10-01',
      status: 'ACTIVE',
      createdByMembershipId: 'membership-1',
      createdAt,
      closedAt: null,
    });

    expect(toLoanDetails(loan)).toEqual({
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
      createdAt,
      closedAt: null,
    });
  });
});
