import { describe, expect, it, vi } from 'vitest';
import { CancelLoanUseCase } from '@/modules/loans/application/use-cases/cancel-loan.use-case.js';
import { Loan } from '@/modules/loans/domain/entities/loan.entity.js';
import { LoanNotCancelableError } from '@/modules/loans/domain/errors/loan-not-cancelable.error.js';
import { LoanNotFoundError } from '@/modules/loans/domain/errors/loan-not-found.error.js';
import type { LoanRepository } from '@/modules/loans/domain/repositories/loan.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');
const NOW = new Date('2026-10-05T00:00:00Z');

function activeLoan() {
  return Loan.create({
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
}

function setup(current: Loan | null = activeLoan()) {
  const saved: Loan[] = [];
  const update = vi.fn((loan: Loan) => {
    saved.push(loan);
    return Promise.resolve();
  });
  const loans: LoanRepository = {
    listLenderIdsWithStatus: vi.fn(() => Promise.resolve([])),
    listActiveByClients: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve()),
    findById: vi.fn(() => Promise.resolve(current)),
    list: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
    update,
  };
  const clock: Clock = { now: () => NOW };
  return { useCase: new CancelLoanUseCase(loans, clock), update, saved };
}

describe('CancelLoanUseCase', () => {
  it('cancela un préstamo ACTIVE: cambia el estado y guarda closedAt', async () => {
    const { useCase, saved } = setup();

    const canceled = await useCase.execute('loan-1', 'lender-1');

    expect(canceled.status).toBe('CANCELED');
    expect(canceled.closedAt).toEqual(NOW);
    expect(saved).toHaveLength(1);
    expect(saved[0]?.status).toBe('CANCELED');
  });

  it('conserva el resto de los datos del préstamo', async () => {
    const { useCase } = setup();

    const canceled = await useCase.execute('loan-1', 'lender-1');

    expect(canceled.principalAmount).toBe(500_000);
    expect(canceled.clientId).toBe('client-1');
  });

  it('lanza LoanNotFoundError si no existe, o es de otro prestamista', async () => {
    const { useCase } = setup(null);

    await expect(useCase.execute('loan-1', 'lender-1')).rejects.toBeInstanceOf(
      LoanNotFoundError,
    );
  });

  it.each([['PAID_OFF' as const], ['CANCELED' as const]])(
    'lanza LoanNotCancelableError si ya está %s, sin guardar nada',
    async (status) => {
      const notActive = Loan.create({
        id: 'loan-1',
        lenderId: 'lender-1',
        clientId: 'client-1',
        principalAmount: 500_000,
        installmentCount: 20,
        installmentValue: 30_000,
        totalPayable: 600_000,
        frequency: 'DAILY',
        startDate: '2026-10-01',
        status,
        createdByMembershipId: 'membership-1',
        createdAt: CREATED_AT,
        closedAt: CREATED_AT,
      });
      const { useCase, update } = setup(notActive);

      await expect(
        useCase.execute('loan-1', 'lender-1'),
      ).rejects.toBeInstanceOf(LoanNotCancelableError);
      expect(update).not.toHaveBeenCalled();
    },
  );
});
