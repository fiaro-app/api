import { describe, expect, it, vi } from 'vitest';
import { PrismaSubscriptionPaymentRepository } from '@/modules/subscriptions/infrastructure/persistence/prisma-subscription-payment.repository.js';

const INPUT = {
  reference: 'fiaro-1',
  refundedAt: new Date('2026-11-14T15:00:00Z'),
  refundedByUserId: 'admin-1',
  mode: 'MANUAL' as const,
  refundReference: null,
  reason: 'Doble cobro',
};

describe('PrismaSubscriptionPaymentRepository.refund', () => {
  it('si el pago ya no estaba aprobado no toca la suscripción', async () => {
    const update = vi.fn();
    const tx = {
      subscriptionPayment: { updateMany: () => Promise.resolve({ count: 0 }) },
      subscription: { update },
    };
    const prisma = {
      $transaction: (run: (client: typeof tx) => unknown) => run(tx),
    };

    const outcome = await new PrismaSubscriptionPaymentRepository(
      prisma as never,
    ).refund(INPUT);

    expect(outcome).toBe('ALREADY_RESOLVED');
    expect(update).not.toHaveBeenCalled();
  });
});
