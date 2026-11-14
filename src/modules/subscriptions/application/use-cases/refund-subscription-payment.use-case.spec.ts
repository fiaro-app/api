import { describe, expect, it, vi } from 'vitest';
import { RefundSubscriptionPaymentUseCase } from '@/modules/subscriptions/application/use-cases/refund-subscription-payment.use-case.js';
import { SubscriptionPayment } from '@/modules/subscriptions/domain/entities/subscription-payment.entity.js';
import { PaymentNotRefundableError } from '@/modules/subscriptions/domain/errors/payment-not-refundable.error.js';
import { RefundGatewayFailedError } from '@/modules/subscriptions/domain/errors/refund-gateway-failed.error.js';
import { RefundMethodUnsupportedError } from '@/modules/subscriptions/domain/errors/refund-method-unsupported.error.js';
import { SubscriptionPaymentNotFoundError } from '@/modules/subscriptions/domain/errors/subscription-payment-not-found.error.js';

const NOW = new Date('2026-11-14T15:00:00Z');

function payment(over: Partial<SubscriptionPayment['props']> = {}) {
  return SubscriptionPayment.create({
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
    periodEndsAt: new Date('2026-12-14T00:00:00Z'),
    createdAt: new Date('2026-11-13T00:00:00Z'),
    resolvedAt: new Date('2026-11-13T00:01:00Z'),
    ...over,
  });
}

function setup(
  found: SubscriptionPayment | null,
  gateway: { canVoid?: boolean; void?: 'ACCEPTED' | 'REJECTED' } = {},
  refundOutcome: 'APPLIED' | 'ALREADY_RESOLVED' = 'APPLIED',
) {
  const repository = {
    findByReference: vi.fn(() => Promise.resolve(found)),
    refund: vi.fn(() => Promise.resolve(refundOutcome)),
  };
  const voidTransaction = vi.fn(() =>
    Promise.resolve(gateway.void ?? 'ACCEPTED'),
  );
  const audit = { record: vi.fn() };
  const useCase = new RefundSubscriptionPaymentUseCase(
    repository as never,
    { canVoid: () => gateway.canVoid ?? true, voidTransaction } as never,
    { now: () => NOW },
    audit,
  );
  return { useCase, repository, voidTransaction, audit };
}

const MANUAL = {
  reference: 'fiaro-1',
  mode: 'MANUAL' as const,
  refundReference: 'banco-1',
  reason: 'Doble cobro',
  actorUserId: 'admin-1',
};

describe('RefundSubscriptionPaymentUseCase', () => {
  it('en modo manual registra la devolución sin llamar a Wompi y la audita', async () => {
    const { useCase, repository, voidTransaction, audit } = setup(payment());

    await useCase.execute(MANUAL);

    expect(voidTransaction).not.toHaveBeenCalled();
    expect(repository.refund).toHaveBeenCalledWith({
      reference: 'fiaro-1',
      refundedAt: NOW,
      refundedByUserId: 'admin-1',
      mode: 'MANUAL',
      refundReference: 'banco-1',
      reason: 'Doble cobro',
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'billing.payment.refunded',
        outcome: 'SUCCESS',
        details: expect.objectContaining({ tenantId: 't1', mode: 'MANUAL' }),
      }),
    );
  });

  it('con WOMPI_VOID anula primero la transacción de un pago con tarjeta', async () => {
    const { useCase, repository, voidTransaction } = setup(payment());

    await useCase.execute({ ...MANUAL, mode: 'WOMPI_VOID' });

    expect(voidTransaction).toHaveBeenCalledWith('tx-1');
    expect(repository.refund).toHaveBeenCalled();
  });

  it.each([
    ['no es con tarjeta', payment({ paymentMethodType: 'PSE' }), {}],
    ['no hay transacción', payment({ wompiTransactionId: null }), {}],
    ['faltan las llaves', payment(), { canVoid: false }],
  ])('WOMPI_VOID no sirve si %s', async (_name, found, gateway) => {
    const { useCase, repository } = setup(found, gateway);

    await expect(
      useCase.execute({ ...MANUAL, mode: 'WOMPI_VOID' }),
    ).rejects.toBeInstanceOf(RefundMethodUnsupportedError);
    expect(repository.refund).not.toHaveBeenCalled();
  });

  it('si Wompi no acepta la anulación no toca nada', async () => {
    const { useCase, repository } = setup(payment(), { void: 'REJECTED' });

    await expect(
      useCase.execute({ ...MANUAL, mode: 'WOMPI_VOID' }),
    ).rejects.toBeInstanceOf(RefundGatewayFailedError);
    expect(repository.refund).not.toHaveBeenCalled();
  });

  it('una orden que no existe, o un pago que no está aprobado, no se devuelve', async () => {
    await expect(setup(null).useCase.execute(MANUAL)).rejects.toBeInstanceOf(
      SubscriptionPaymentNotFoundError,
    );
    for (const status of ['PENDING', 'DECLINED', 'REFUNDED'] as const) {
      await expect(
        setup(payment({ status })).useCase.execute(MANUAL),
      ).rejects.toBeInstanceOf(PaymentNotRefundableError);
    }
  });

  it('si otra devolución ganó la carrera, responde que ya no se puede y no audita', async () => {
    const { useCase, audit } = setup(payment(), {}, 'ALREADY_RESOLVED');

    await expect(useCase.execute(MANUAL)).rejects.toBeInstanceOf(
      PaymentNotRefundableError,
    );
    expect(audit.record).not.toHaveBeenCalled();
  });
});
