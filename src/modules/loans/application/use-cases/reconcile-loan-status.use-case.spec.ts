import { describe, expect, it, vi } from 'vitest';
import { Loan } from '@/modules/loans/domain/entities/loan.entity.js';
import type { LoanRepository } from '@/modules/loans/domain/repositories/loan.repository.js';
import { ReconcileLoanStatusUseCase } from '@/modules/loans/application/use-cases/reconcile-loan-status.use-case.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';

const NOW = new Date('2026-10-01T14:05:00Z');
const CREATED_AT = new Date('2026-09-24T00:00:00Z');

function loan(status: 'ACTIVE' | 'PAID_OFF' | 'CANCELED'): Loan {
  return Loan.create({
    id: 'loan-1',
    lenderId: 'lender-1',
    clientId: 'client-1',
    principalAmount: 50_000,
    installmentCount: 5,
    installmentValue: 10_000,
    totalPayable: 50_000,
    frequency: 'DAILY',
    startDate: '2026-09-24',
    status,
    createdByMembershipId: 'membership-1',
    createdAt: CREATED_AT,
    closedAt: status === 'PAID_OFF' ? CREATED_AT : null,
  });
}

function setup(current: Loan | null) {
  const findById = vi.fn(() => Promise.resolve(current));
  const update = vi.fn<(loan: Loan) => Promise<void>>(() => Promise.resolve());
  const loans: LoanRepository = {
    listLenderIdsWithStatus: vi.fn(() => Promise.resolve([])),
    countActive: vi.fn(() => Promise.resolve(0)),
    listActiveByClients: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve()),
    findById,
    list: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
    update,
  };
  const clock: Clock = { now: () => NOW };
  const useCase = new ReconcileLoanStatusUseCase(loans, clock);
  return { useCase, findById, update };
}

describe('ReconcileLoanStatusUseCase', () => {
  it.each([
    { netTotalPaid: 50_000, expectedStatus: 'PAID_OFF' as const },
    { netTotalPaid: 60_000, expectedStatus: 'PAID_OFF' as const },
    { netTotalPaid: 40_000, expectedStatus: null },
  ])(
    'con un préstamo ACTIVE y netTotalPaid $netTotalPaid, termina en $expectedStatus',
    async ({ netTotalPaid, expectedStatus }) => {
      const { useCase, update } = setup(loan('ACTIVE'));

      await useCase.execute('loan-1', 'lender-1', netTotalPaid);

      if (expectedStatus === null) {
        expect(update).not.toHaveBeenCalled();
        return;
      }
      expect(update).toHaveBeenCalledOnce();
      const [updated] = update.mock.calls[0] as [Loan];
      expect(updated.status).toBe(expectedStatus);
      expect(updated.closedAt).toEqual(NOW);
    },
  );

  it('reabre a ACTIVE un préstamo PAID_OFF si una reversión deja saldo pendiente', async () => {
    const { useCase, update } = setup(loan('PAID_OFF'));

    await useCase.execute('loan-1', 'lender-1', 40_000);

    expect(update).toHaveBeenCalledOnce();
    const [updated] = update.mock.calls[0] as [Loan];
    expect(updated.status).toBe('ACTIVE');
    expect(updated.closedAt).toBeNull();
  });

  it('no toca un préstamo PAID_OFF que sigue sin saldo pendiente', async () => {
    const { useCase, update } = setup(loan('PAID_OFF'));

    await useCase.execute('loan-1', 'lender-1', 50_000);

    expect(update).not.toHaveBeenCalled();
  });

  it('nunca toca un préstamo CANCELED, sin importar lo pagado', async () => {
    const { useCase, update } = setup(loan('CANCELED'));

    await useCase.execute('loan-1', 'lender-1', 0);

    expect(update).not.toHaveBeenCalled();
  });

  it('no hace nada si el préstamo no existe', async () => {
    const { useCase, update } = setup(null);

    await useCase.execute('loan-1', 'lender-1', 50_000);

    expect(update).not.toHaveBeenCalled();
  });
});
