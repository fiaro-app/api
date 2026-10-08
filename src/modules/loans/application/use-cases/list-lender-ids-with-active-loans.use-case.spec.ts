import { describe, expect, it, vi } from 'vitest';
import { ListLenderIdsWithActiveLoansUseCase } from '@/modules/loans/application/use-cases/list-lender-ids-with-active-loans.use-case.js';
import type { LoanRepository } from '@/modules/loans/domain/repositories/loan.repository.js';

describe('ListLenderIdsWithActiveLoansUseCase', () => {
  it('pide a la base los prestamistas con préstamos activos', async () => {
    const listLenderIdsWithStatus = vi.fn(() =>
      Promise.resolve(['lender-1', 'lender-2']),
    );
    const loans = { listLenderIdsWithStatus } as unknown as LoanRepository;
    const useCase = new ListLenderIdsWithActiveLoansUseCase(loans);

    await expect(useCase.execute()).resolves.toEqual(['lender-1', 'lender-2']);

    expect(listLenderIdsWithStatus).toHaveBeenCalledWith('ACTIVE');
  });
});
