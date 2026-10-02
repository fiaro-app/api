import { ForbiddenException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it, vi } from 'vitest';
import type { CreatePaymentReversalUseCase } from '@/modules/collections/application/use-cases/create-payment-reversal.use-case.js';
import { PaymentReversalController } from '@/modules/collections/infrastructure/controllers/payment-reversal.controller.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';

const DETAILS = {
  id: 'reversal-1',
  paymentId: 'payment-1',
  reason: 'Monto equivocado.',
  reversedByMembershipId: 'membership-admin',
  createdAt: new Date('2026-10-01T14:05:00Z'),
};

function setup() {
  const createPaymentReversalUseCase = {
    execute: vi.fn(() => Promise.resolve(DETAILS)),
  };
  const controller = new PaymentReversalController(
    createPaymentReversalUseCase as unknown as CreatePaymentReversalUseCase,
  );
  return { controller, createPaymentReversalUseCase };
}

const scopeWith = (roles: readonly string[]): LenderScope => ({
  membershipId: 'membership-admin',
  lenderId: 'lender-1',
  roles,
});

describe('PaymentReversalController', () => {
  it('publica POST, colgando de payments/:id/reversals', () => {
    const handler = Reflect.get(
      PaymentReversalController.prototype,
      'createPaymentReversal',
    ) as object;
    const method = Reflect.getMetadata(
      METHOD_METADATA,
      handler,
    ) as RequestMethod;
    expect(RequestMethod[method]).toBe('POST');
    expect(Reflect.getMetadata(PATH_METADATA, PaymentReversalController)).toBe(
      'payments/:id/reversals',
    );
  });

  describe('createPaymentReversal', () => {
    it('con rol LENDER crea la reversión, con la membresía de la sesión', async () => {
      const { controller, createPaymentReversalUseCase } = setup();

      const response = await controller.createPaymentReversal(
        'payment-1',
        { reason: 'Monto equivocado.' },
        scopeWith(['LENDER']),
      );

      expect(
        createPaymentReversalUseCase.execute,
      ).toHaveBeenCalledExactlyOnceWith({
        lenderId: 'lender-1',
        paymentId: 'payment-1',
        reason: 'Monto equivocado.',
        reversedByMembershipId: 'membership-admin',
      });
      expect(response.id).toBe('reversal-1');
    });

    it('con rol OWNER también crea la reversión', async () => {
      const { controller, createPaymentReversalUseCase } = setup();

      await controller.createPaymentReversal(
        'payment-1',
        { reason: 'Monto equivocado.' },
        scopeWith(['OWNER']),
      );

      expect(createPaymentReversalUseCase.execute).toHaveBeenCalledOnce();
    });

    it('con solo el rol COLLECTOR responde 403 sin crear nada', async () => {
      const { controller, createPaymentReversalUseCase } = setup();

      const error = await controller
        .createPaymentReversal(
          'payment-1',
          { reason: 'Monto equivocado.' },
          scopeWith(['COLLECTOR']),
        )
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(createPaymentReversalUseCase.execute).not.toHaveBeenCalled();
    });
  });
});
