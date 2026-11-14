import { Inject, Injectable } from '@nestjs/common';
import { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import type { SubscriptionPayment } from '@/modules/subscriptions/domain/entities/subscription-payment.entity.js';
import { SubscriptionPaymentNotFoundError } from '@/modules/subscriptions/domain/errors/subscription-payment-not-found.error.js';
import type { SubscriptionPaymentRepository } from '@/modules/subscriptions/domain/repositories/subscription-payment.repository.js';
import { SUBSCRIPTION_PAYMENT_REPOSITORY } from '@/modules/subscriptions/domain/tokens/subscription-payment-repository.token.js';

/**
 * En qué quedó una orden de pago. La usa la página a la que Wompi devuelve a la dueña: ella
 * pregunta hasta que el aviso de Wompi (el que de verdad confirma) cambie el estado.
 */
@Injectable()
export class GetCheckoutStatusUseCase {
  constructor(
    @Inject(SUBSCRIPTION_PAYMENT_REPOSITORY)
    private readonly payments: SubscriptionPaymentRepository,
    private readonly getLender: GetLenderUseCase,
  ) {}

  /**
   * @param lenderId - El prestamista con el que opera la sesión.
   * @param reference - La referencia de la orden.
   * @throws {@link SubscriptionPaymentNotFoundError} Si no existe o es de otro negocio.
   */
  async execute(
    lenderId: string,
    reference: string,
  ): Promise<SubscriptionPayment> {
    const lender = await this.getLender.execute(lenderId);
    const payment = await this.payments.findByReference(reference);
    if (payment?.tenantId !== lender.tenantId) {
      throw new SubscriptionPaymentNotFoundError(reference);
    }
    return payment;
  }
}
