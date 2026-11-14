import { describe, expect, it, vi } from 'vitest';
import type { GetLoanUseCase } from '@/modules/loans/application/use-cases/get-loan.use-case.js';
import type { ReconcileLoanStatusUseCase } from '@/modules/loans/application/use-cases/reconcile-loan-status.use-case.js';
import { CreateCollectionVisitUseCase } from '@/modules/collections/application/use-cases/create-collection-visit.use-case.js';
import { CollectionAssignment } from '@/modules/collections/domain/entities/collection-assignment.entity.js';
import { CollectionVisit } from '@/modules/collections/domain/entities/collection-visit.entity.js';
import { Payment } from '@/modules/collections/domain/entities/payment.entity.js';
import { CollectorNotAssignedError } from '@/modules/collections/domain/errors/collector-not-assigned.error.js';
import { InvalidCollectionVisitDataError } from '@/modules/collections/domain/errors/invalid-collection-visit-data.error.js';
import type { CollectionAssignmentRepository } from '@/modules/collections/domain/repositories/collection-assignment.repository.js';
import type { CollectionVisitRecord } from '@/modules/collections/domain/repositories/collection-visit-record.js';
import type { CollectionVisitRepository } from '@/modules/collections/domain/repositories/collection-visit.repository.js';
import type { IsDaySettledUseCase } from '@/modules/settlements/application/use-cases/is-day-settled.use-case.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';

const NOW = new Date('2026-10-01T14:05:00Z');
const OCCURRED_AT = new Date('2026-10-01T14:00:00Z');

const LOAN = { id: 'loan-1', installmentValue: 30_000 } as never;

const ASSIGNED = CollectionAssignment.create({
  id: 'assignment-1',
  loanId: 'loan-1',
  collectorMembershipId: 'membership-1',
  effectiveFrom: '2026-09-01',
  effectiveTo: null,
  createdAt: NOW,
});

function setup(
  existing: CollectionVisitRecord | null = null,
  listByLoanResult: readonly CollectionVisitRecord[] = [],
  assignedLoans: readonly CollectionAssignment[] = [ASSIGNED],
) {
  const create = vi.fn<
    (visit: CollectionVisit, payment: Payment | null) => Promise<void>
  >(() => Promise.resolve());
  const findById = vi.fn(() => Promise.resolve(existing));
  const listByLoan = vi.fn(() => Promise.resolve(listByLoanResult));
  const visits: CollectionVisitRepository = {
    create,
    findById,
    listByLoan,
    listByCollectorAndPromisedDate: vi.fn(),
    listByCollectorAndDateRange: vi.fn(),
    summarizeByCollectorAndDateRange: vi.fn(),
  };
  const findActiveByCollectorAndDate = vi.fn(() =>
    Promise.resolve(assignedLoans),
  );
  const assignments: CollectionAssignmentRepository = {
    listOpenByCollector: vi.fn(() => Promise.resolve([])),
    reassign: vi.fn(() => Promise.resolve()),
    create: vi.fn(),
    findOpenByLoan: vi.fn(),
    listByLoan: vi.fn(),
    findActiveByCollectorAndDate,
    update: vi.fn(),
  };
  const getLoanExecute = vi.fn(() => Promise.resolve(LOAN));
  const getLoan = { execute: getLoanExecute } as unknown as GetLoanUseCase;
  const reconcileExecute = vi.fn(() => Promise.resolve());
  const reconcileLoanStatus = {
    execute: reconcileExecute,
  } as unknown as ReconcileLoanStatusUseCase;
  const ids: IdGenerator = { next: () => 'payment-new' };
  const clock: Clock = { now: () => NOW };
  const useCase = new CreateCollectionVisitUseCase(
    visits,
    assignments,
    getLoan,
    reconcileLoanStatus,
    {
      execute: vi.fn(() => Promise.resolve(false)),
    } as unknown as IsDaySettledUseCase,
    ids,
    clock,
  );
  return {
    useCase,
    create,
    findById,
    listByLoan,
    findActiveByCollectorAndDate,
    getLoanExecute,
    reconcileExecute,
  };
}

/** Un registro PAID con pago, sin reversión, para pruebas de `listByLoan`. */
function paidRecord(id: string, amount: number): CollectionVisitRecord {
  return {
    visit: CollectionVisit.create({
      id,
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      outcome: 'PAID',
      expectedAmount: 30_000,
      promisedDate: null,
      occurredAt: OCCURRED_AT,
      createdAt: NOW,
    }),
    payment: Payment.create({
      id: `${id}-payment`,
      loanId: 'loan-1',
      visitId: id,
      amount,
      method: 'CASH',
      occurredAt: OCCURRED_AT,
      createdAt: NOW,
    }),
    reversal: null,
  };
}

describe('CreateCollectionVisitUseCase', () => {
  it('registra una visita PAID con su pago', async () => {
    const { useCase, create } = setup();

    const result = await useCase.execute({
      lenderId: 'lender-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      id: 'visit-1',
      outcome: 'PAID',
      occurredAt: OCCURRED_AT,
      payment: { amount: 30_000 },
    });

    expect(create).toHaveBeenCalledOnce();
    const [visit, payment] = create.mock.calls[0] as [CollectionVisit, Payment];
    expect(visit.expectedAmount).toBe(30_000);
    expect(payment.amount).toBe(30_000);
    expect(payment.method).toBe('CASH');
    expect(payment.visitId).toBe('visit-1');
    expect(result.payment?.amount).toBe(30_000);
  });

  it('usa el medio de pago del pedido en vez de CASH si llega uno', async () => {
    const { useCase, create } = setup();

    await useCase.execute({
      lenderId: 'lender-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      id: 'visit-1',
      outcome: 'PAID',
      occurredAt: OCCURRED_AT,
      payment: { amount: 30_000, method: 'NEQUI' },
    });

    const [, payment] = create.mock.calls[0] as [CollectionVisit, Payment];
    expect(payment.method).toBe('NEQUI');
  });

  it('registra una visita NOT_FOUND sin pago, sin reconciliar el préstamo', async () => {
    const { useCase, create, reconcileExecute } = setup();

    const result = await useCase.execute({
      lenderId: 'lender-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      id: 'visit-1',
      outcome: 'NOT_FOUND',
      occurredAt: OCCURRED_AT,
    });

    const [, payment] = create.mock.calls[0] as [
      CollectionVisit,
      Payment | null,
    ];
    expect(payment).toBeNull();
    expect(result.payment).toBeNull();
    expect(reconcileExecute).not.toHaveBeenCalled();
  });

  it('registra una visita RESCHEDULED con promisedDate', async () => {
    const { useCase, create } = setup();

    const result = await useCase.execute({
      lenderId: 'lender-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      id: 'visit-1',
      outcome: 'RESCHEDULED',
      promisedDate: '2026-10-05',
      occurredAt: OCCURRED_AT,
    });

    expect(create).toHaveBeenCalledOnce();
    expect(result.promisedDate).toBe('2026-10-05');
  });

  it('después de un pago, reconcilia el préstamo con lo pagado de verdad', async () => {
    const { useCase, reconcileExecute } = setup(null, [
      paidRecord('visit-a', 10_000),
      paidRecord('visit-b', 10_000),
    ]);

    await useCase.execute({
      lenderId: 'lender-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      id: 'visit-1',
      outcome: 'PAID',
      occurredAt: OCCURRED_AT,
      payment: { amount: 30_000 },
    });

    expect(reconcileExecute).toHaveBeenCalledExactlyOnceWith(
      'loan-1',
      'lender-1',
      20_000,
    );
  });

  it('reenviar la misma visita devuelve el resultado original sin volver a escribir ni reconciliar', async () => {
    const existingVisit = CollectionVisit.create({
      id: 'visit-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      outcome: 'PAID',
      expectedAmount: 30_000,
      promisedDate: null,
      occurredAt: OCCURRED_AT,
      createdAt: NOW,
    });
    const existingPayment = Payment.create({
      id: 'payment-1',
      loanId: 'loan-1',
      visitId: 'visit-1',
      amount: 30_000,
      method: 'CASH',
      occurredAt: OCCURRED_AT,
      createdAt: NOW,
    });
    const { useCase, create, findById, getLoanExecute, reconcileExecute } =
      setup({ visit: existingVisit, payment: existingPayment, reversal: null });

    const result = await useCase.execute({
      lenderId: 'lender-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      id: 'visit-1',
      outcome: 'PAID',
      occurredAt: OCCURRED_AT,
      payment: { amount: 30_000 },
    });

    expect(getLoanExecute).toHaveBeenCalledExactlyOnceWith(
      'loan-1',
      'lender-1',
    );
    expect(findById).toHaveBeenCalledExactlyOnceWith('visit-1', 'loan-1');
    expect(create).not.toHaveBeenCalled();
    expect(reconcileExecute).not.toHaveBeenCalled();
    expect(result.payment?.id).toBe('payment-1');
  });

  it('rechaza PAID sin pago, sin guardar nada', async () => {
    const { useCase, create } = setup();

    await expect(
      useCase.execute({
        lenderId: 'lender-1',
        loanId: 'loan-1',
        collectorMembershipId: 'membership-1',
        id: 'visit-1',
        outcome: 'PAID',
        occurredAt: OCCURRED_AT,
      }),
    ).rejects.toBeInstanceOf(InvalidCollectionVisitDataError);
    expect(create).not.toHaveBeenCalled();
  });

  it('consulta la asignación con la fecha de occurredAt, no la de hoy', async () => {
    const { useCase, findActiveByCollectorAndDate } = setup();

    await useCase.execute({
      lenderId: 'lender-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      id: 'visit-1',
      outcome: 'NOT_FOUND',
      occurredAt: OCCURRED_AT,
    });

    expect(findActiveByCollectorAndDate).toHaveBeenCalledExactlyOnceWith(
      'membership-1',
      '2026-10-01',
    );
  });

  it('rechaza sin una CollectionAssignment vigente para este préstamo, sin guardar nada ("modo cobrador", PRODUCT.md §6)', async () => {
    const { useCase, create } = setup(null, [], []);

    await expect(
      useCase.execute({
        lenderId: 'lender-1',
        loanId: 'loan-1',
        collectorMembershipId: 'membership-1',
        id: 'visit-1',
        outcome: 'NOT_FOUND',
        occurredAt: OCCURRED_AT,
      }),
    ).rejects.toBeInstanceOf(CollectorNotAssignedError);
    expect(create).not.toHaveBeenCalled();
  });

  it('rechaza si tiene asignaciones vigentes, pero ninguna de este préstamo', async () => {
    const otherLoanAssignment = CollectionAssignment.create({
      id: 'assignment-2',
      loanId: 'loan-2',
      collectorMembershipId: 'membership-1',
      effectiveFrom: '2026-09-01',
      effectiveTo: null,
      createdAt: NOW,
    });
    const { useCase } = setup(null, [], [otherLoanAssignment]);

    await expect(
      useCase.execute({
        lenderId: 'lender-1',
        loanId: 'loan-1',
        collectorMembershipId: 'membership-1',
        id: 'visit-1',
        outcome: 'NOT_FOUND',
        occurredAt: OCCURRED_AT,
      }),
    ).rejects.toBeInstanceOf(CollectorNotAssignedError);
  });
});
