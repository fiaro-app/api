import { describe, expect, it, vi } from 'vitest';
import type { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import type { PaymentGateway } from '@/modules/subscriptions/application/ports/payment-gateway.port.js';
import { CreateCheckoutUseCase } from '@/modules/subscriptions/application/use-cases/create-checkout.use-case.js';
import type { SubscriptionPayment } from '@/modules/subscriptions/domain/entities/subscription-payment.entity.js';
import { BillingUnavailableError } from '@/modules/subscriptions/domain/errors/billing-unavailable.error.js';
import type { SubscriptionPaymentRepository } from '@/modules/subscriptions/domain/repositories/subscription-payment.repository.js';

const NOW = new Date('2026-10-16T12:00:00Z');

function setup(configured = true) {
  const saved: SubscriptionPayment[] = [];
  const create = vi.fn((payment: SubscriptionPayment) => {
    saved.push(payment);
    return Promise.resolve();
  });
  const payments = { create } as unknown as SubscriptionPaymentRepository;
  const checkoutFor = vi.fn(
    (order: {
      reference: string;
      amountInCents: number;
      currency: string;
    }) => ({
      url: 'https://checkout.wompi.co/p/',
      publicKey: 'pub_test_abc',
      currency: order.currency,
      amountInCents: order.amountInCents,
      reference: order.reference,
      signatureIntegrity: 'firma',
      redirectUrl: 'https://app.fiaro.co/plan',
    }),
  );
  const gateway = {
    isConfigured: () => configured,
    checkoutFor,
  } as unknown as PaymentGateway;
  const record = vi.fn();
  const useCase = new CreateCheckoutUseCase(
    payments,
    gateway,
    {
      execute: vi.fn(() => Promise.resolve({ tenantId: 'tenant-1' })),
    } as unknown as GetLenderUseCase,
    { next: () => 'abc' },
    { now: () => NOW },
    { record },
  );
  return { useCase, saved, checkoutFor, record, create };
}

describe('CreateCheckoutUseCase', () => {
  it('crea la orden PENDING con el precio del plan en centavos, no con uno que mande el cliente', async () => {
    const { useCase, saved } = setup();

    const created = await useCase.execute('lender-1', 'PRO');

    expect(saved).toHaveLength(1);
    expect(saved[0]?.props).toMatchObject({
      tenantId: 'tenant-1',
      planCode: 'PRO',
      months: 1,
      amountInCents: 6_900_000,
      currency: 'COP',
      reference: 'fiaro-abc',
      status: 'PENDING',
      wompiTransactionId: null,
      createdAt: NOW,
    });
    expect(created).toMatchObject({
      reference: 'fiaro-abc',
      planCode: 'PRO',
      months: 1,
      checkout: { amountInCents: 6_900_000, reference: 'fiaro-abc' },
    });
  });

  it.each([
    ['INDIVIDUAL', 4_900_000],
    ['PRO', 6_900_000],
    ['TEAM', 14_900_000],
  ] as const)('cobra el plan %s a %i centavos', async (plan, cents) => {
    const { useCase, checkoutFor } = setup();

    await useCase.execute('lender-1', plan);

    expect(checkoutFor).toHaveBeenCalledWith({
      reference: 'fiaro-abc',
      amountInCents: cents,
      currency: 'COP',
    });
  });

  it('deja registro de la orden', async () => {
    const { useCase, record } = setup();

    await useCase.execute('lender-1', 'INDIVIDUAL');

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'billing.checkout.created',
        outcome: 'SUCCESS',
        details: expect.objectContaining({
          reference: 'fiaro-abc',
          planCode: 'INDIVIDUAL',
        }) as unknown,
      }),
    );
  });

  it('sin Wompi configurado no crea nada', async () => {
    const { useCase, create } = setup(false);

    await expect(useCase.execute('lender-1', 'PRO')).rejects.toBeInstanceOf(
      BillingUnavailableError,
    );
    expect(create).not.toHaveBeenCalled();
  });
});
