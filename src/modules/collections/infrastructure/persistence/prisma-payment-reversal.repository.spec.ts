import { describe, expect, it, vi } from 'vitest';
import { PaymentReversal } from '@/modules/collections/domain/entities/payment-reversal.entity.js';
import { PaymentAlreadyReversedError } from '@/modules/collections/domain/errors/payment-already-reversed.error.js';
import { PrismaPaymentReversalRepository } from '@/modules/collections/infrastructure/persistence/prisma-payment-reversal.repository.js';
import { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

const CREATED_AT = new Date('2026-10-01T14:05:00Z');

const reversal = PaymentReversal.create({
  id: 'reversal-1',
  paymentId: 'payment-1',
  reason: 'Monto equivocado.',
  reversedByMembershipId: 'membership-1',
  createdAt: CREATED_AT,
});

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('error de prueba', {
    code,
    clientVersion: 'test',
  });

function setup() {
  const create = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve(),
  );
  const repository = new PrismaPaymentReversalRepository({
    paymentReversal: { create },
  } as unknown as PrismaService);
  return { repository, create };
}

describe('PrismaPaymentReversalRepository.create', () => {
  it('guarda la reversión', async () => {
    const { repository, create } = setup();

    await repository.create(reversal);

    expect(create).toHaveBeenCalledExactlyOnceWith({
      data: {
        id: 'reversal-1',
        paymentId: 'payment-1',
        reason: 'Monto equivocado.',
        reversedByMembershipId: 'membership-1',
        createdAt: CREATED_AT,
      },
    });
  });

  it('traduce P2002 a PaymentAlreadyReversedError', async () => {
    const { repository, create } = setup();
    create.mockRejectedValueOnce(prismaError('P2002'));

    await expect(repository.create(reversal)).rejects.toBeInstanceOf(
      PaymentAlreadyReversedError,
    );
  });

  it('deja pasar cualquier otro error', async () => {
    const { repository, create } = setup();
    const other = new Error('otro error');
    create.mockRejectedValueOnce(other);

    await expect(repository.create(reversal)).rejects.toBe(other);
  });
});
