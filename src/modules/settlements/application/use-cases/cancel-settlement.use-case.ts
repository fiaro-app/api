import { Inject, Injectable } from '@nestjs/common';
import { SettlementNotCancelableError } from '@/modules/settlements/domain/errors/settlement-not-cancelable.error.js';
import { SettlementNotFoundError } from '@/modules/settlements/domain/errors/settlement-not-found.error.js';
import type { DailySettlementRepository } from '@/modules/settlements/domain/repositories/daily-settlement.repository.js';
import { DAILY_SETTLEMENT_REPOSITORY } from '@/modules/settlements/domain/tokens/daily-settlement-repository.token.js';

/** Qué cuadre se cancela, y quién lo pide. */
export interface CancelSettlementInput {
  readonly settlementId: string;
  /** El prestamista de la sesión. */
  readonly lenderId: string;
  /** El cobrador de la sesión: solo puede cancelar el suyo. */
  readonly collectorMembershipId: string;
}

/**
 * El cobrador retira el cuadre que envió —por error, o para cambiar sus cobros— mientras sigue en
 * revisión (`PENDING`) (D-130). El cuadre se borra: el cobrador puede volver a cobrar ese día y a
 * enviar uno nuevo. Uno ya aprobado o rechazado no se cancela.
 */
@Injectable()
export class CancelSettlementUseCase {
  constructor(
    @Inject(DAILY_SETTLEMENT_REPOSITORY)
    private readonly settlements: DailySettlementRepository,
  ) {}

  /**
   * @throws {@link SettlementNotFoundError} Si no existe, es de otro prestamista o de otro cobrador.
   * @throws {@link SettlementNotCancelableError} Si ya no está `PENDING`.
   */
  async execute(input: CancelSettlementInput): Promise<void> {
    const settlement = await this.settlements.findById(
      input.settlementId,
      input.lenderId,
    );
    if (settlement?.collectorMembershipId !== input.collectorMembershipId) {
      throw new SettlementNotFoundError();
    }
    if (settlement.status !== 'PENDING') {
      throw new SettlementNotCancelableError();
    }
    await this.settlements.delete(settlement.id);
  }
}
