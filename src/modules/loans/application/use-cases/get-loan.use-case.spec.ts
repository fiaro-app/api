import { describe, expect, it, vi } from 'vitest';
import { GetLoanUseCase } from '@/modules/loans/application/use-cases/get-loan.use-case.js';
import { Loan } from '@/modules/loans/domain/entities/loan.entity.js';
import { LoanNotFoundError } from '@/modules/loans/domain/errors/loan-not-found.error.js';
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
  const findById = vi.fn(() => Promise.resolve<Loan | null>(null));
  const loans: LoanRepository = {
    create: vi.fn(() => Promise.resolve()),
    findById,
    list: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
  };
  return { useCase: new GetLoanUseCase(loans), findById };
}

describe('GetLoanUseCase', () => {
  it('devuelve el préstamo si existe para ese prestamista', async () => {
    const { useCase, findById } = setup();
    findById.mockResolvedValueOnce(loan);

    const details = await useCase.execute('loan-1', 'lender-1');

    expect(findById).toHaveBeenCalledExactlyOnceWith('loan-1', 'lender-1');
    expect(details.id).toBe('loan-1');
  });

  it('lanza LoanNotFoundError si no existe, o es de otro prestamista', async () => {
    const { useCase } = setup();

    await expect(useCase.execute('loan-1', 'lender-1')).rejects.toBeInstanceOf(
      LoanNotFoundError,
    );
  });
});
