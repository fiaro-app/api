import { describe, expect, it } from 'vitest';
import { SubscriptionPayment } from '@/modules/subscriptions/domain/entities/subscription-payment.entity.js';
import {
  CheckoutStatusResponseSchema,
  CreateCheckoutRequestSchema,
  toCheckoutStatusResponse,
} from '@/modules/subscriptions/infrastructure/controllers/schemas/subscription-checkout.schema.js';

const AT = new Date('2026-10-16T12:00:00Z');

const payment = (over: {
  status: 'PENDING' | 'APPROVED';
  resolvedAt: Date | null;
  periodEndsAt: Date | null;
}) =>
  SubscriptionPayment.create({
    id: 'p1',
    tenantId: 'tenant-1',
    planCode: 'PRO',
    months: 1,
    amountInCents: 6_900_000,
    currency: 'COP',
    reference: 'fiaro-p1',
    wompiTransactionId: null,
    paymentMethodType: null,
    createdAt: AT,
    ...over,
  });

describe('CreateCheckoutRequestSchema', () => {
  it('acepta solo un plan que se puede comprar, y nada más', () => {
    expect(
      CreateCheckoutRequestSchema.safeParse({ planCode: 'PRO' }).success,
    ).toBe(true);
    expect(
      CreateCheckoutRequestSchema.safeParse({ planCode: 'TRIAL' }).success,
    ).toBe(false);
    expect(
      CreateCheckoutRequestSchema.safeParse({
        planCode: 'PRO',
        amountInCents: 1,
      }).success,
    ).toBe(false);
  });
});

describe('toCheckoutStatusResponse', () => {
  it('una orden pendiente no tiene fecha de resolución ni de vencimiento', () => {
    const response = toCheckoutStatusResponse(
      payment({ status: 'PENDING', resolvedAt: null, periodEndsAt: null }),
    );

    expect(response).toMatchObject({
      status: 'PENDING',
      resolvedAt: null,
      periodEndsAt: null,
    });
    expect(CheckoutStatusResponseSchema.safeParse(response).success).toBe(true);
  });

  it('una aprobada trae cuándo se resolvió y hasta cuándo quedó pagado', () => {
    const ends = new Date('2026-11-16T12:00:00Z');
    const response = toCheckoutStatusResponse(
      payment({ status: 'APPROVED', resolvedAt: AT, periodEndsAt: ends }),
    );

    expect(response).toMatchObject({
      status: 'APPROVED',
      resolvedAt: AT.toISOString(),
      periodEndsAt: ends.toISOString(),
    });
  });
});
