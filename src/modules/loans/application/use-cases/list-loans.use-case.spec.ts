import { describe, expect, it, vi } from 'vitest';
import { ListLoansUseCase } from '@/modules/loans/application/use-cases/list-loans.use-case.js';
import { Loan } from '@/modules/loans/domain/entities/loan.entity.js';
import type { LoanRepository } from '@/modules/loans/domain/repositories/loan.repository.js';

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
  createdAt: new Date('2026-09-30T00:00:00Z'),
  closedAt: null,
});

function setup() {
  const list = vi.fn(() => Promise.resolve({ items: [loan], total: 1 }));
  const loans: LoanRepository = {
    listLenderIdsWithStatus: vi.fn(() => Promise.resolve([])),
    listActiveByClients: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve()),
    findById: vi.fn(() => Promise.resolve(null)),
    list,
    update: vi.fn(() => Promise.resolve()),
  };
  return { useCase: new ListLoansUseCase(loans), list };
}

describe('ListLoansUseCase', () => {
  it('devuelve la página de préstamos, traducidos a sus datos públicos', async () => {
    const { useCase, list } = setup();

    const page = await useCase.execute({
      lenderId: 'lender-1',
      page: 1,
      pageSize: 20,
      clientId: 'client-1',
      status: 'ACTIVE',
    });

    expect(list).toHaveBeenCalledExactlyOnceWith({
      lenderId: 'lender-1',
      page: 1,
      pageSize: 20,
      clientId: 'client-1',
      status: 'ACTIVE',
    });
    expect(page).toEqual({
      items: [
        {
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
          createdAt: loan.createdAt,
          closedAt: null,
        },
      ],
      total: 1,
    });
  });
});
