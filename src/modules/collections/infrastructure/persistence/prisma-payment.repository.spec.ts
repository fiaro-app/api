import { describe, expect, it, vi } from 'vitest';
import { Payment } from '@/modules/collections/domain/entities/payment.entity.js';
import { PrismaPaymentRepository } from '@/modules/collections/infrastructure/persistence/prisma-payment.repository.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

const OCCURRED_AT = new Date('2026-10-01T14:00:00Z');

const row = {
  id: 'payment-1',
  loanId: 'loan-1',
  visitId: 'visit-1',
  amount: 30_000,
  method: 'CASH' as const,
  occurredAt: OCCURRED_AT,
  createdAt: OCCURRED_AT,
};

function setup() {
  const findFirst = vi.fn<(args: unknown) => Promise<unknown>>();
  const repository = new PrismaPaymentRepository({
    payment: { findFirst },
  } as unknown as PrismaService);
  return { repository, findFirst };
}

describe('PrismaPaymentRepository.findById', () => {
  it('filtra por el lenderId del préstamo que pagó, no por un campo propio', async () => {
    const { repository, findFirst } = setup();
    findFirst.mockResolvedValueOnce(row);

    const found = await repository.findById('payment-1', 'lender-1');

    expect(findFirst).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'payment-1', loan: { lenderId: 'lender-1' } },
    });
    expect(found).toEqual(
      Payment.create({
        id: 'payment-1',
        loanId: 'loan-1',
        visitId: 'visit-1',
        amount: 30_000,
        method: 'CASH',
        occurredAt: OCCURRED_AT,
        createdAt: OCCURRED_AT,
      }),
    );
  });

  it('da null si no existe para ese prestamista', async () => {
    const { repository, findFirst } = setup();
    findFirst.mockResolvedValueOnce(null);

    await expect(
      repository.findById('payment-1', 'lender-1'),
    ).resolves.toBeNull();
  });
});
