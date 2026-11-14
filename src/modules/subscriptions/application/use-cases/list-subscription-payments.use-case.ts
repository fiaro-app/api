import { Inject, Injectable } from '@nestjs/common';
import { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import type { SubscriptionPayment } from '@/modules/subscriptions/domain/entities/subscription-payment.entity.js';
import type { SubscriptionPaymentRepository } from '@/modules/subscriptions/domain/repositories/subscription-payment.repository.js';
import { SUBSCRIPTION_PAYMENT_REPOSITORY } from '@/modules/subscriptions/domain/tokens/subscription-payment-repository.token.js';

/** Cuántos pagos devuelve el historial como máximo: el negocio paga una vez al mes, son cuatro años. */
export const PAYMENT_HISTORY_LIMIT = 50;

/** El historial de órdenes de pago del negocio de la sesión, de la más reciente a la más vieja. */
@Injectable()
export class ListSubscriptionPaymentsUseCase {
  constructor(
    @Inject(SUBSCRIPTION_PAYMENT_REPOSITORY)
    private readonly payments: SubscriptionPaymentRepository,
    private readonly getLender: GetLenderUseCase,
  ) {}

  /** @param lenderId - El prestamista con el que opera la sesión. */
  async execute(lenderId: string): Promise<readonly SubscriptionPayment[]> {
    const lender = await this.getLender.execute(lenderId);
    return await this.payments.listByTenant(
      lender.tenantId,
      PAYMENT_HISTORY_LIMIT,
    );
  }
}
