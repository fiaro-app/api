import { describe, expect, it, vi } from 'vitest';
import { CollectionVisit } from '@/modules/collections/domain/entities/collection-visit.entity.js';
import { Payment } from '@/modules/collections/domain/entities/payment.entity.js';
import { PaymentReversal } from '@/modules/collections/domain/entities/payment-reversal.entity.js';
import { PrismaCollectionVisitRepository } from '@/modules/collections/infrastructure/persistence/prisma-collection-visit.repository.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

const OCCURRED_AT = new Date('2026-10-01T14:00:00Z');
const CREATED_AT = new Date('2026-10-01T14:05:00Z');

const visit = CollectionVisit.create({
  id: 'visit-1',
  loanId: 'loan-1',
  collectorMembershipId: 'membership-1',
  outcome: 'PAID',
  expectedAmount: 30_000,
  promisedDate: null,
  occurredAt: OCCURRED_AT,
  createdAt: CREATED_AT,
});

const payment = Payment.create({
  id: 'payment-1',
  loanId: 'loan-1',
  visitId: 'visit-1',
  amount: 30_000,
  method: 'CASH',
  occurredAt: OCCURRED_AT,
  createdAt: CREATED_AT,
});

const reversal = PaymentReversal.create({
  id: 'reversal-1',
  paymentId: 'payment-1',
  reason: 'Monto equivocado.',
  reversedByMembershipId: 'membership-2',
  createdAt: CREATED_AT,
});

const visitRow = {
  id: 'visit-1',
  loanId: 'loan-1',
  collectorMembershipId: 'membership-1',
  outcome: 'PAID' as const,
  expectedAmount: 30_000,
  promisedDate: null,
  occurredAt: OCCURRED_AT,
  createdAt: CREATED_AT,
};

const paymentRow = {
  id: 'payment-1',
  loanId: 'loan-1',
  visitId: 'visit-1',
  amount: 30_000,
  method: 'CASH' as const,
  occurredAt: OCCURRED_AT,
  createdAt: CREATED_AT,
  reversal: null,
};

const reversalRow = {
  id: 'reversal-1',
  paymentId: 'payment-1',
  reason: 'Monto equivocado.',
  reversedByMembershipId: 'membership-2',
  createdAt: CREATED_AT,
};

function setup() {
  const create = vi.fn<(args: unknown) => Promise<unknown>>();
  const findFirst = vi.fn<(args: unknown) => Promise<unknown>>();
  const findMany = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve([]),
  );
  const paymentCreate = vi.fn<(args: unknown) => unknown>();
  const $transaction = vi.fn((operations: Promise<unknown>[]) =>
    Promise.all(operations),
  );
  const repository = new PrismaCollectionVisitRepository({
    collectionVisit: { create, findFirst, findMany },
    payment: { create: paymentCreate },
    $transaction,
  } as unknown as PrismaService);
  return {
    repository,
    create,
    findFirst,
    findMany,
    paymentCreate,
    $transaction,
  };
}

const WITH_PAYMENT_AND_REVERSAL = { payment: { include: { reversal: true } } };

describe('PrismaCollectionVisitRepository.create', () => {
  it('guarda la visita y su pago en una sola transacción', async () => {
    const { repository, $transaction, create, paymentCreate } = setup();
    create.mockReturnValueOnce(Promise.resolve());
    paymentCreate.mockReturnValueOnce(Promise.resolve());

    await repository.create(visit, payment);

    expect($transaction).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledExactlyOnceWith({
      data: {
        id: 'visit-1',
        loanId: 'loan-1',
        collectorMembershipId: 'membership-1',
        outcome: 'PAID',
        expectedAmount: 30_000,
        promisedDate: null,
        occurredAt: OCCURRED_AT,
        createdAt: CREATED_AT,
      },
    });
    expect(paymentCreate).toHaveBeenCalledExactlyOnceWith({
      data: {
        id: 'payment-1',
        loanId: 'loan-1',
        visitId: 'visit-1',
        amount: 30_000,
        method: 'CASH',
        occurredAt: OCCURRED_AT,
        createdAt: CREATED_AT,
      },
    });
  });

  it('sin pago, solo guarda la visita', async () => {
    const { repository, create, paymentCreate } = setup();
    create.mockReturnValueOnce(Promise.resolve());

    await repository.create(visit, null);

    expect(create).toHaveBeenCalledOnce();
    expect(paymentCreate).not.toHaveBeenCalled();
  });
});

describe('PrismaCollectionVisitRepository.findById', () => {
  it('devuelve la visita con su pago si existe para ese préstamo, sin reversión', async () => {
    const { repository, findFirst } = setup();
    findFirst.mockResolvedValueOnce({ ...visitRow, payment: paymentRow });

    const found = await repository.findById('visit-1', 'loan-1');

    expect(findFirst).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'visit-1', loanId: 'loan-1' },
      include: WITH_PAYMENT_AND_REVERSAL,
    });
    expect(found?.visit).toEqual(visit);
    expect(found?.payment).toEqual(payment);
    expect(found?.reversal).toBeNull();
  });

  it('devuelve también la reversión del pago, si tiene una', async () => {
    const { repository, findFirst } = setup();
    findFirst.mockResolvedValueOnce({
      ...visitRow,
      payment: { ...paymentRow, reversal: reversalRow },
    });

    const found = await repository.findById('visit-1', 'loan-1');

    expect(found?.reversal).toEqual(reversal);
  });

  it('devuelve la visita con payment en null si no generó pago', async () => {
    const { repository, findFirst } = setup();
    findFirst.mockResolvedValueOnce({
      ...visitRow,
      outcome: 'NOT_FOUND',
      payment: null,
    });

    const found = await repository.findById('visit-1', 'loan-1');

    expect(found?.payment).toBeNull();
    expect(found?.reversal).toBeNull();
  });

  it('devuelve null si no existe para ese préstamo', async () => {
    const { repository, findFirst } = setup();
    findFirst.mockResolvedValueOnce(null);

    await expect(repository.findById('visit-1', 'loan-1')).resolves.toBeNull();
  });
});

describe('PrismaCollectionVisitRepository.listByLoan', () => {
  it('devuelve las visitas del préstamo, de la más antigua a la más nueva', async () => {
    const { repository, findMany } = setup();
    findMany.mockResolvedValueOnce([{ ...visitRow, payment: paymentRow }]);

    const found = await repository.listByLoan('loan-1');

    expect(findMany).toHaveBeenCalledExactlyOnceWith({
      where: { loanId: 'loan-1' },
      include: WITH_PAYMENT_AND_REVERSAL,
      orderBy: { occurredAt: 'asc' },
    });
    expect(found).toHaveLength(1);
    expect(found[0]?.visit).toEqual(visit);
  });
});
