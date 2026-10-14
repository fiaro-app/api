import { describe, expect, it } from 'vitest';
import { Loan } from '@/modules/loans/domain/entities/loan.entity.js';
import {
  toLoan,
  toLoanCreateInput,
} from '@/modules/loans/infrastructure/persistence/loan.mapper.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

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
  createdAt: CREATED_AT,
  closedAt: null,
});

describe('toLoanCreateInput', () => {
  it('arma los datos de la fila de loans', () => {
    expect(toLoanCreateInput(loan)).toEqual({
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
      createdAt: CREATED_AT,
      closedAt: null,
    });
  });
});

describe('toLoan', () => {
  it('convierte la fila en la entidad de dominio', () => {
    const row = {
      id: 'loan-1',
      lenderId: 'lender-1',
      clientId: 'client-1',
      principalAmount: 500_000,
      installmentCount: 20,
      installmentValue: 30_000,
      totalPayable: 600_000,
      frequency: 'DAILY' as const,
      startDate: '2026-10-01',
      status: 'ACTIVE' as const,
      createdByMembershipId: 'membership-1',
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
      closedAt: null,
    };

    expect(toLoan(row)).toEqual(loan);
  });
});
