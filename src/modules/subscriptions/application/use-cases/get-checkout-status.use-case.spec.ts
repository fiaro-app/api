import { describe, expect, it, vi } from 'vitest';
import type { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import { GetCheckoutStatusUseCase } from '@/modules/subscriptions/application/use-cases/get-checkout-status.use-case.js';
import { SubscriptionPayment } from '@/modules/subscriptions/domain/entities/subscription-payment.entity.js';
import { SubscriptionPaymentNotFoundError } from '@/modules/subscriptions/domain/errors/subscription-payment-not-found.error.js';
import type { SubscriptionPaymentRepository } from '@/modules/subscriptions/domain/repositories/subscription-payment.repository.js';

const payment = (tenantId: string) =>
  SubscriptionPayment.create({
    id: 'p1',
    tenantId,
    planCode: 'PRO',
    months: 1,
    amountInCents: 6_900_000,
    currency: 'COP',
    reference: 'fiaro-p1',
    status: 'PENDING',
    wompiTransactionId: null,
    paymentMethodType: null,
    periodEndsAt: null,
    createdAt: new Date('2026-10-16T12:00:00Z'),
    resolvedAt: null,
  });

function setup(found: SubscriptionPayment | null) {
  return new GetCheckoutStatusUseCase(
    {
      findByReference: vi.fn(() => Promise.resolve(found)),
    } as unknown as SubscriptionPaymentRepository,
    {
      execute: vi.fn(() => Promise.resolve({ tenantId: 'tenant-1' })),
    } as unknown as GetLenderUseCase,
  );
}

describe('GetCheckoutStatusUseCase', () => {
  it('devuelve la orden de su negocio', async () => {
    const found = payment('tenant-1');

    await expect(setup(found).execute('lender-1', 'fiaro-p1')).resolves.toBe(
      found,
    );
  });

  it('una orden de otro negocio es indistinguible de una que no existe', async () => {
    for (const found of [payment('tenant-2'), null]) {
      await expect(
        setup(found).execute('lender-1', 'fiaro-p1'),
      ).rejects.toBeInstanceOf(SubscriptionPaymentNotFoundError);
    }
  });
});
