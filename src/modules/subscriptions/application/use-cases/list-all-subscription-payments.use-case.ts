import { Inject, Injectable } from '@nestjs/common';
import type { SubscriptionPaymentStatus } from '@/modules/subscriptions/domain/entities/subscription-payment.entity.js';
import type {
  PaymentWithTenant,
  SubscriptionPaymentRepository,
} from '@/modules/subscriptions/domain/repositories/subscription-payment.repository.js';
import { SUBSCRIPTION_PAYMENT_REPOSITORY } from '@/modules/subscriptions/domain/tokens/subscription-payment-repository.token.js';

/** Los pagos del plan de todos los negocios, para quien opera la plataforma (D-156). */
@Injectable()
export class ListAllSubscriptionPaymentsUseCase {
  constructor(
    @Inject(SUBSCRIPTION_PAYMENT_REPOSITORY)
    private readonly payments: SubscriptionPaymentRepository,
  ) {}

  /**
   * @param limit - Cuántos como máximo.
   * @param status - Solo los que están en este estado; ausente para todos.
   */
  async execute(
    limit: number,
    status?: SubscriptionPaymentStatus,
  ): Promise<readonly PaymentWithTenant[]> {
    return await this.payments.listAll(limit, status);
  }
}
