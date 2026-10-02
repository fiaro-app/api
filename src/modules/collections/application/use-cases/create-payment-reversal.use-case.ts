import { Inject, Injectable } from '@nestjs/common';
import { ReconcileLoanStatusUseCase } from '@/modules/loans/application/use-cases/reconcile-loan-status.use-case.js';
import type {
  CreatePaymentReversalInput,
  PaymentReversalDetails,
} from '@/modules/collections/application/dtos/payment-reversal-details.dto.js';
import { toPaymentReversalDetails } from '@/modules/collections/application/dtos/payment-reversal-details.mapper.js';
import { sumNetPayments } from '@/modules/collections/application/services/sum-net-payments.js';
import { PaymentReversal } from '@/modules/collections/domain/entities/payment-reversal.entity.js';
import { PaymentNotFoundError } from '@/modules/collections/domain/errors/payment-not-found.error.js';
import type { CollectionVisitRepository } from '@/modules/collections/domain/repositories/collection-visit.repository.js';
import type { PaymentReversalRepository } from '@/modules/collections/domain/repositories/payment-reversal.repository.js';
import type { PaymentRepository } from '@/modules/collections/domain/repositories/payment.repository.js';
import { COLLECTION_VISIT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-visit-repository.token.js';
import { PAYMENT_REVERSAL_REPOSITORY } from '@/modules/collections/domain/tokens/payment-reversal-repository.token.js';
import { PAYMENT_REPOSITORY } from '@/modules/collections/domain/tokens/payment-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';

/**
 * Anula un pago del prestamista de la sesión (PRODUCT.md §5, D-16). Solo la llama un rol `LENDER`
 * (lo decide el controller, mismo patrón que crear un préstamo).
 *
 * @remarks
 * El pago queda intacto (append-only): la reversión es la fila nueva que dice que ya no cuenta.
 * `PaymentRepository.findById` ya filtra por `lenderId` a través del préstamo, así que un pago
 * ajeno es indistinguible de uno que no existe. `PaymentReversalRepository.create` es quien
 * impide reversar dos veces (`@@unique([paymentId])`, D-76 mismo patrón de P2002). Después de
 * guardarla, recalcula cuánto queda pagado de verdad (`sumNetPayments`) y llama
 * `ReconcileLoanStatusUseCase` (D-85): si el préstamo ya estaba `PAID_OFF` y la reversión deja
 * saldo pendiente, lo reabre a `ACTIVE`.
 */
@Injectable()
export class CreatePaymentReversalUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
    @Inject(PAYMENT_REVERSAL_REPOSITORY)
    private readonly reversals: PaymentReversalRepository,
    @Inject(COLLECTION_VISIT_REPOSITORY)
    private readonly visits: CollectionVisitRepository,
    private readonly reconcileLoanStatus: ReconcileLoanStatusUseCase,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param input - El pago, el motivo y quién la hace.
   * @returns La reversión registrada.
   * @throws {@link PaymentNotFoundError} Si el pago no existe, o es de otro prestamista.
   * @throws {@link PaymentAlreadyReversedError} Si ese pago ya tiene una reversión.
   */
  async execute(
    input: CreatePaymentReversalInput,
  ): Promise<PaymentReversalDetails> {
    const payment = await this.payments.findById(
      input.paymentId,
      input.lenderId,
    );
    if (payment === null) {
      throw new PaymentNotFoundError(input.paymentId);
    }

    const reversal = PaymentReversal.create({
      id: this.ids.next(),
      paymentId: payment.id,
      reason: input.reason,
      reversedByMembershipId: input.reversedByMembershipId,
      createdAt: this.clock.now(),
    });
    await this.reversals.create(reversal);

    const records = await this.visits.listByLoan(payment.loanId);
    await this.reconcileLoanStatus.execute(
      payment.loanId,
      input.lenderId,
      sumNetPayments(records),
    );

    return toPaymentReversalDetails(reversal);
  }
}
