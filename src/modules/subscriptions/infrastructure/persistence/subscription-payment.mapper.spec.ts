import { describe, expect, it } from 'vitest';
import {
  toSubscriptionPayment,
  toSubscriptionPaymentCreateInput,
} from '@/modules/subscriptions/infrastructure/persistence/subscription-payment.mapper.js';

const ROW = {
  id: 'p1',
  tenantId: 't1',
  planCode: 'PRO',
  months: 1,
  amountInCents: 6_900_000,
  currency: 'COP',
  reference: 'fiaro-1',
  status: 'APPROVED',
  wompiTransactionId: 'tx-1',
  paymentMethodType: 'CARD',
  periodEndsAt: null,
  createdAt: new Date('2026-11-13T00:00:00Z'),
  resolvedAt: null,
  refundedAt: null,
  refundedByUserId: null,
  refundMode: null,
  refundReference: null,
  refundReason: null,
} as never;

describe('subscription payment mapper', () => {
  it('lee un pago sin reembolso con refund en null', () => {
    expect(toSubscriptionPayment(ROW).props.refund).toBeNull();
  });

  it('lee el reembolso cuando están todos sus datos', () => {
    const payment = toSubscriptionPayment({
      ...(ROW as object),
      status: 'REFUNDED',
      refundedAt: new Date('2026-11-14T00:00:00Z'),
      refundedByUserId: 'admin-1',
      refundMode: 'MANUAL',
      refundReference: 'banco-1',
      refundReason: 'Doble cobro',
    } as never);

    expect(payment.props.refund).toEqual({
      refundedAt: new Date('2026-11-14T00:00:00Z'),
      refundedByUserId: 'admin-1',
      mode: 'MANUAL',
      reference: 'banco-1',
      reason: 'Doble cobro',
    });
  });

  it('al guardar, escribe las columnas del reembolso solo si lo hay', () => {
    const plain = toSubscriptionPayment(ROW);
    const refunded = toSubscriptionPayment({
      ...(ROW as object),
      refundedAt: new Date('2026-11-14T00:00:00Z'),
      refundedByUserId: 'admin-1',
      refundMode: 'MANUAL',
      refundReference: null,
      refundReason: 'x',
    } as never);

    expect(toSubscriptionPaymentCreateInput(plain)).not.toHaveProperty(
      'refundMode',
    );
    expect(toSubscriptionPaymentCreateInput(refunded)).toMatchObject({
      refundMode: 'MANUAL',
      refundReason: 'x',
    });
  });
});
