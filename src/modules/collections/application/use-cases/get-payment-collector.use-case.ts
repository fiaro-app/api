import { Inject, Injectable } from '@nestjs/common';
import { PaymentNotFoundError } from '@/modules/collections/domain/errors/payment-not-found.error.js';
import type { CollectionVisitRepository } from '@/modules/collections/domain/repositories/collection-visit.repository.js';
import type { PaymentRepository } from '@/modules/collections/domain/repositories/payment.repository.js';
import { COLLECTION_VISIT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-visit-repository.token.js';
import { PAYMENT_REPOSITORY } from '@/modules/collections/domain/tokens/payment-repository.token.js';

/** Quién cobró un pago: lo usa `attachments` para saber qué cobrador puede ver y cambiar el comprobante. */
@Injectable()
export class GetPaymentCollectorUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
    @Inject(COLLECTION_VISIT_REPOSITORY)
    private readonly visits: CollectionVisitRepository,
  ) {}

  /**
   * @param paymentId - El pago.
   * @param lenderId - El prestamista dueño.
   * @throws {@link PaymentNotFoundError} Si el pago no existe, o es de otro prestamista.
   */
  async execute(
    paymentId: string,
    lenderId: string,
  ): Promise<{ readonly collectorMembershipId: string }> {
    const payment = await this.payments.findById(paymentId, lenderId);
    const record =
      payment === null
        ? null
        : await this.visits.findById(payment.visitId, payment.loanId);
    if (record === null) {
      throw new PaymentNotFoundError(paymentId);
    }
    return { collectorMembershipId: record.visit.collectorMembershipId };
  }
}
