import { describe, expect, it, vi } from 'vitest';
import type {
  ParsedEvent,
  PaymentEvent,
  PaymentGateway,
} from '@/modules/subscriptions/application/ports/payment-gateway.port.js';
import type { CreateNotificationUseCase } from '@/modules/notifications/application/use-cases/create-notification.use-case.js';
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

const APPROVED_ORDER = SubscriptionPayment.create({
  ...ORDER.props,
  status: 'APPROVED',
  periodEndsAt: new Date('2026-11-16T12:00:00Z'),
});

function setup(
  parsed: ParsedEvent,
  options: {
    order?: SubscriptionPayment | null;
    approve?: 'APPLIED' | 'ALREADY_RESOLVED';
    owners?: readonly { userId: string; lenderId: string }[];
    notifyFails?: boolean;
  } = {},
) {
  const approve = vi.fn(() => Promise.resolve(options.approve ?? 'APPLIED'));
  const reject = vi.fn(() => Promise.resolve(options.approve ?? 'APPLIED'));
  const record = vi.fn();
  const execute = vi.fn(() =>
    options.notifyFails === true
      ? Promise.reject(new Error('correo caído'))
      : Promise.resolve({}),
  );
  const useCase = new ProcessPaymentEventUseCase(
    {
      findByReference: vi
        .fn()
        .mockResolvedValueOnce(
          options.order === undefined ? ORDER : options.order,
        )
        .mockResolvedValue(APPROVED_ORDER),
      approve,
      reject,
    } as unknown as SubscriptionPaymentRepository,
    { parseEvent: () => parsed } as unknown as PaymentGateway,
    { now: () => NOW },
    { record },
    {
      ownersOf: () =>
        Promise.resolve(
          options.owners ?? [{ userId: 'user-1', lenderId: 'lender-1' }],
        ),
    },
    { execute } as unknown as CreateNotificationUseCase,
  );
  return { useCase, approve, reject, record, execute };
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

  it('le confirma el pago a la dueña con el plan, el monto y hasta cuándo queda pagado', async () => {
    const { useCase, execute } = setup(transaction());

    await useCase.execute({}, undefined);

    expect(execute).toHaveBeenCalledExactlyOnceWith({
      recipientUserId: 'user-1',
      lenderId: 'lender-1',
      severity: 'SUCCESS',
      title: 'Pago recibido',
      body: expect.stringMatching(
        /\$\s?69\.000 del plan Pro.*16 de noviembre de 2026/,
      ) as string,
      relatedEntityType: 'SUBSCRIPTION',
      relatedEntityId: 'p1',
    });
  });

  it('avisa a cada dueña, y a nadie si no hay ninguna', async () => {
    const two = setup(transaction(), {
      owners: [
        { userId: 'user-1', lenderId: 'lender-1' },
        { userId: 'user-2', lenderId: 'lender-1' },
      ],
    });
    await two.useCase.execute({}, undefined);
    expect(two.execute).toHaveBeenCalledTimes(2);

    const none = setup(transaction(), { owners: [] });
    await none.useCase.execute({}, undefined);
    expect(none.execute).not.toHaveBeenCalled();
  });

  it('si no se puede avisar, el pago igual queda aprobado y no se propaga el error', async () => {
    const { useCase } = setup(transaction(), { notifyFails: true });

    expect(await useCase.execute({}, undefined)).toBe('APPROVED');
  });

  it('un cierre sin aprobar o un aviso repetido no mandan confirmación', async () => {
    const declined = setup(transaction({ status: 'DECLINED' }));
    await declined.useCase.execute({}, undefined);
    const duplicate = setup(transaction(), { approve: 'ALREADY_RESOLVED' });
    await duplicate.useCase.execute({}, undefined);

    expect(declined.execute).not.toHaveBeenCalled();
    expect(duplicate.execute).not.toHaveBeenCalled();
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
