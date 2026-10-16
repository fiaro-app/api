import { describe, expect, it, vi } from 'vitest';
import type {
  ParsedEvent,
  PaymentEvent,
  PaymentGateway,
} from '@/modules/subscriptions/application/ports/payment-gateway.port.js';
import { ProcessPaymentEventUseCase } from '@/modules/subscriptions/application/use-cases/process-payment-event.use-case.js';
import { SubscriptionPayment } from '@/modules/subscriptions/domain/entities/subscription-payment.entity.js';
import type { SubscriptionPaymentRepository } from '@/modules/subscriptions/domain/repositories/subscription-payment.repository.js';

const NOW = new Date('2026-10-16T12:00:00Z');

const ORDER = SubscriptionPayment.create({
  id: 'p1',
  tenantId: 'tenant-1',
  planCode: 'PRO',
  months: 1,
  amountInCents: 6_900_000,
  currency: 'COP',
  reference: 'fiaro-p1',
  status: 'PENDING',
  wompiTransactionId: null,
  paymentMethodType: null,
  periodEndsAt: null,
  createdAt: NOW,
  resolvedAt: null,
});

const EVENT: PaymentEvent = {
  reference: 'fiaro-p1',
  wompiTransactionId: 'tx-1',
  status: 'APPROVED',
  amountInCents: 6_900_000,
  currency: 'COP',
  paymentMethodType: 'PSE',
};

function setup(
  parsed: ParsedEvent,
  options: {
    order?: SubscriptionPayment | null;
    approve?: 'APPLIED' | 'ALREADY_RESOLVED';
  } = {},
) {
  const approve = vi.fn(() => Promise.resolve(options.approve ?? 'APPLIED'));
  const reject = vi.fn(() => Promise.resolve(options.approve ?? 'APPLIED'));
  const record = vi.fn();
  const useCase = new ProcessPaymentEventUseCase(
    {
      findByReference: vi.fn(() =>
        Promise.resolve(options.order === undefined ? ORDER : options.order),
      ),
      approve,
      reject,
    } as unknown as SubscriptionPaymentRepository,
    { parseEvent: () => parsed } as unknown as PaymentGateway,
    { now: () => NOW },
    { record },
  );
  return { useCase, approve, reject, record };
}

const transaction = (over: Partial<PaymentEvent> = {}): ParsedEvent => ({
  kind: 'transaction',
  event: { ...EVENT, ...over },
});

describe('ProcessPaymentEventUseCase', () => {
  it('un aviso con la firma mala se rechaza y se registra', async () => {
    const { useCase, approve, record } = setup({ kind: 'invalid' });

    expect(await useCase.execute({}, undefined)).toBe('INVALID');
    expect(approve).not.toHaveBeenCalled();
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'billing.webhook.rejected',
        reason: 'INVALID_SIGNATURE',
      }),
    );
  });

  it('un aviso auténtico de otro tipo se ignora sin tocar nada', async () => {
    const { useCase, approve, reject } = setup({ kind: 'ignored' });

    expect(await useCase.execute({}, undefined)).toBe('IGNORED');
    expect(approve).not.toHaveBeenCalled();
    expect(reject).not.toHaveBeenCalled();
  });

  it('aprueba la orden y lo registra', async () => {
    const { useCase, approve, record } = setup(transaction());

    expect(await useCase.execute({}, undefined)).toBe('APPROVED');
    expect(approve).toHaveBeenCalledExactlyOnceWith({
      reference: 'fiaro-p1',
      wompiTransactionId: 'tx-1',
      paymentMethodType: 'PSE',
      resolvedAt: NOW,
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'billing.payment.approved',
        outcome: 'SUCCESS',
      }),
    );
  });

  it('un aviso repetido no vuelve a aplicar el pago ni lo registra otra vez', async () => {
    const { useCase, record } = setup(transaction(), {
      approve: 'ALREADY_RESOLVED',
    });

    expect(await useCase.execute({}, undefined)).toBe('DUPLICATE');
    expect(record).not.toHaveBeenCalled();
  });

  it.each(['DECLINED', 'VOIDED', 'ERROR'])(
    '%s cierra la orden sin aprobarla',
    async (status) => {
      const { useCase, approve, reject, record } = setup(
        transaction({ status }),
      );

      expect(await useCase.execute({}, undefined)).toBe('NOT_APPROVED');
      expect(approve).not.toHaveBeenCalled();
      expect(reject).toHaveBeenCalledWith(
        expect.objectContaining({ reference: 'fiaro-p1' }),
        status,
      );
      expect(record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'billing.payment.not_approved',
          outcome: 'FAILURE',
          reason: status,
        }),
      );
    },
  );

  it('un cierre repetido es un duplicado', async () => {
    const { useCase } = setup(transaction({ status: 'DECLINED' }), {
      approve: 'ALREADY_RESOLVED',
    });

    expect(await useCase.execute({}, undefined)).toBe('DUPLICATE');
  });

  it('PENDING y estados que no conoce no hacen nada', async () => {
    const { useCase, approve, reject } = setup(
      transaction({ status: 'PENDING' }),
    );

    expect(await useCase.execute({}, undefined)).toBe('IGNORED');
    expect(approve).not.toHaveBeenCalled();
    expect(reject).not.toHaveBeenCalled();
  });

  it('una referencia desconocida se registra y no se aplica', async () => {
    const { useCase, approve, record } = setup(transaction(), { order: null });

    expect(await useCase.execute({}, undefined)).toBe('REJECTED');
    expect(approve).not.toHaveBeenCalled();
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'billing.webhook.rejected',
        reason: 'UNKNOWN_REFERENCE',
      }),
    );
  });

  it.each([{ amountInCents: 100 }, { currency: 'USD' }])(
    'un monto o moneda distintos (%j) no aprueban',
    async (over) => {
      const { useCase, approve, record } = setup(transaction(over));

      expect(await useCase.execute({}, undefined)).toBe('REJECTED');
      expect(approve).not.toHaveBeenCalled();
      expect(record).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'AMOUNT_MISMATCH' }),
      );
    },
  );
});
