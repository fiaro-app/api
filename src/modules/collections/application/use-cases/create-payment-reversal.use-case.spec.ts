import { describe, expect, it, vi } from 'vitest';
import type { ReconcileLoanStatusUseCase } from '@/modules/loans/application/use-cases/reconcile-loan-status.use-case.js';
import { CreatePaymentReversalUseCase } from '@/modules/collections/application/use-cases/create-payment-reversal.use-case.js';
import { CollectionVisit } from '@/modules/collections/domain/entities/collection-visit.entity.js';
import { Payment } from '@/modules/collections/domain/entities/payment.entity.js';
import { PaymentNotFoundError } from '@/modules/collections/domain/errors/payment-not-found.error.js';
import type { CollectionVisitRepository } from '@/modules/collections/domain/repositories/collection-visit.repository.js';
import type { CollectionVisitRecord } from '@/modules/collections/domain/repositories/collection-visit-record.js';
import type { PaymentReversalRepository } from '@/modules/collections/domain/repositories/payment-reversal.repository.js';
import type { PaymentRepository } from '@/modules/collections/domain/repositories/payment.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';

const NOW = new Date('2026-10-01T14:05:00Z');

const PAYMENT = Payment.create({
  id: 'payment-1',
  loanId: 'loan-1',
  visitId: 'visit-1',
  amount: 30_000,
  method: 'CASH',
  occurredAt: NOW,
  createdAt: NOW,
});

function paidRecord(id: string, amount: number): CollectionVisitRecord {
  return {
    visit: CollectionVisit.create({
      id,
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      outcome: 'PAID',
      expectedAmount: amount,
      promisedDate: null,
      occurredAt: NOW,
      createdAt: NOW,
    }),
    payment: Payment.create({
      id: `${id}-payment`,
      loanId: 'loan-1',
      visitId: id,
      amount,
      method: 'CASH',
      occurredAt: NOW,
      createdAt: NOW,
    }),
    reversal: null,
  };
}

function setup(
  found: Payment | null = PAYMENT,
  listByLoanResult: readonly CollectionVisitRecord[] = [],
) {
  const findById = vi.fn(() => Promise.resolve(found));
  const payments: PaymentRepository = { findById };
  const create = vi.fn<(reversal: unknown) => Promise<void>>(() =>
    Promise.resolve(),
  );
  const reversals: PaymentReversalRepository = { create };
  const listByLoan = vi.fn(() => Promise.resolve(listByLoanResult));
  const visits: CollectionVisitRepository = {
    create: vi.fn(() => Promise.resolve()),
    findById: vi.fn(() => Promise.resolve(null)),
    listByLoan,
    listByCollectorAndPromisedDate: vi.fn(),
  };
  const reconcileExecute = vi.fn(() => Promise.resolve());
  const reconcileLoanStatus = {
    execute: reconcileExecute,
  } as unknown as ReconcileLoanStatusUseCase;
  const ids: IdGenerator = { next: () => 'reversal-new' };
  const clock: Clock = { now: () => NOW };
  const useCase = new CreatePaymentReversalUseCase(
    payments,
    reversals,
    visits,
    reconcileLoanStatus,
    ids,
    clock,
  );
  return { useCase, findById, create, listByLoan, reconcileExecute };
}

describe('CreatePaymentReversalUseCase', () => {
  it('crea la reversión con el motivo y quién la hace', async () => {
    const { useCase, create } = setup();

    const result = await useCase.execute({
      lenderId: 'lender-1',
      paymentId: 'payment-1',
      reason: 'Monto equivocado.',
      reversedByMembershipId: 'membership-2',
    });

    expect(create).toHaveBeenCalledOnce();
    const [reversal] = create.mock.calls[0] as [
      { id: string; paymentId: string; reason: string },
    ];
    expect(reversal.id).toBe('reversal-new');
    expect(reversal.paymentId).toBe('payment-1');
    expect(reversal.reason).toBe('Monto equivocado.');
    expect(result.paymentId).toBe('payment-1');
    expect(result.reason).toBe('Monto equivocado.');
  });

  it('lanza PaymentNotFoundError si el pago no existe para este prestamista', async () => {
    const { useCase, create } = setup(null);

    await expect(
      useCase.execute({
        lenderId: 'lender-1',
        paymentId: 'payment-1',
        reason: 'Monto equivocado.',
        reversedByMembershipId: 'membership-2',
      }),
    ).rejects.toBeInstanceOf(PaymentNotFoundError);
    expect(create).not.toHaveBeenCalled();
  });

  it('reconcilia el préstamo con lo que queda pagado de verdad, sin el pago reversado', async () => {
    const { useCase, reconcileExecute } = setup(PAYMENT, [
      paidRecord('visit-a', 10_000),
      paidRecord('visit-b', 10_000),
    ]);

    await useCase.execute({
      lenderId: 'lender-1',
      paymentId: 'payment-1',
      reason: 'Monto equivocado.',
      reversedByMembershipId: 'membership-2',
    });

    expect(reconcileExecute).toHaveBeenCalledExactlyOnceWith(
      'loan-1',
      'lender-1',
      20_000,
    );
  });
});
