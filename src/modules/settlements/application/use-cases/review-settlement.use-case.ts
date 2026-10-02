import { Inject, Injectable } from '@nestjs/common';
import type {
  ReviewSettlementInput,
  SettlementDetails,
} from '@/modules/settlements/application/dtos/settlement-details.dto.js';
import { toSettlementDetails } from '@/modules/settlements/application/dtos/settlement-details.mapper.js';
import { SettlementNotFoundError } from '@/modules/settlements/domain/errors/settlement-not-found.error.js';
import { SettlementNotPendingError } from '@/modules/settlements/domain/errors/settlement-not-pending.error.js';
import type { DailySettlementRepository } from '@/modules/settlements/domain/repositories/daily-settlement.repository.js';
import { DAILY_SETTLEMENT_REPOSITORY } from '@/modules/settlements/domain/tokens/daily-settlement-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/**
 * El prestamista aprueba o rechaza un cuadre `PENDING` (PRODUCT.md §5). El rechazo es
 * informativo: no bloquea la ruta del cobrador, que puede reenviar su cuadre con una aclaración
 * (D-19) y eso lo devuelve a `PENDING` para un ciclo de revisión nuevo. Quién puede llamarlo lo
 * decide el controller (`OWNER` o `LENDER`).
 */
@Injectable()
export class ReviewSettlementUseCase {
  constructor(
    @Inject(DAILY_SETTLEMENT_REPOSITORY)
    private readonly settlements: DailySettlementRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param input - El prestamista de la sesión, la membresía que revisa y la decisión.
   * @throws {@link SettlementNotFoundError} Si el cuadre no existe, o es de otro prestamista.
   * @throws {@link SettlementNotPendingError} Si el cuadre ya se había revisado.
   */
  async execute(input: ReviewSettlementInput): Promise<SettlementDetails> {
    const current = await this.settlements.findById(
      input.settlementId,
      input.lenderId,
    );
    if (current === null) {
      throw new SettlementNotFoundError();
    }
    if (current.status !== 'PENDING') {
      throw new SettlementNotPendingError();
    }

    const reviewed = await this.settlements.review({
      id: current.id,
      status: input.status,
      reviewNote: input.reviewNote,
      reviewedByMembershipId: input.reviewerMembershipId,
      reviewedAt: this.clock.now(),
    });
    return toSettlementDetails(reviewed);
  }
}
