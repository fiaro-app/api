import { describe, expect, it, vi } from 'vitest';
import { SubscriptionPayment } from '@/modules/subscriptions/domain/entities/subscription-payment.entity.js';
import { AdminSubscriptionPaymentsController } from '@/modules/subscriptions/infrastructure/controllers/admin-subscription-payments.controller.js';
import type { AuthenticatedUser } from '@/shared/application/ports/session-resolver.port.js';

const REFUNDED_AT = new Date('2026-11-14T15:00:00Z');
const payment = (refund = true) =>
  SubscriptionPayment.create({
    id: 'p1',
    tenantId: 't1',
    planCode: 'PRO',
    months: 1,
    amountInCents: 6_900_000,
    currency: 'COP',
    reference: 'fiaro-1',
    status: refund ? 'REFUNDED' : 'APPROVED',
    wompiTransactionId: 'tx-1',
    paymentMethodType: 'CARD',
    periodEndsAt: new Date('2026-12-14T00:00:00Z'),
    createdAt: new Date('2026-11-13T00:00:00Z'),
    resolvedAt: null,
    refund: refund
      ? {
          refundedAt: REFUNDED_AT,
          refundedByUserId: 'admin-1',
          mode: 'MANUAL',
          reference: null,
          reason: 'x',
        }
      : null,
  });
const USER = { id: 'admin-1' } as AuthenticatedUser;

describe('AdminSubscriptionPaymentsController', () => {
  it('lista los pagos con el negocio, pasando el filtro de estado', async () => {
    const execute = vi.fn(() =>
      Promise.resolve([{ payment: payment(false), tenantName: 'El Águila' }]),
    );
    const controller = new AdminSubscriptionPaymentsController(
      { execute } as never,
      {} as never,
    );

    const body = await controller.list({ status: 'APPROVED' });

    expect(execute).toHaveBeenCalledWith(50, 'APPROVED');
    expect(body.items[0]).toMatchObject({
      reference: 'fiaro-1',
      tenantName: 'El Águila',
      refundedAt: null,
      refundMode: null,
    });
  });

  it('devuelve un pago con quien lo registra y responde en qué quedó', async () => {
    const execute = vi.fn(() => Promise.resolve(payment()));
    const controller = new AdminSubscriptionPaymentsController(
      {} as never,
      { execute } as never,
    );

    const body = await controller.refund(
      'fiaro-1',
      { mode: 'MANUAL', reason: 'Doble cobro' },
      USER,
    );

    expect(execute).toHaveBeenCalledWith({
      reference: 'fiaro-1',
      mode: 'MANUAL',
      refundReference: null,
      reason: 'Doble cobro',
      actorUserId: 'admin-1',
    });
    expect(body).toMatchObject({
      status: 'REFUNDED',
      refundedAt: REFUNDED_AT.toISOString(),
      refundMode: 'MANUAL',
    });
  });
});
