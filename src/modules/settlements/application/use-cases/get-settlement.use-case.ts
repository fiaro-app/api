import { Inject, Injectable } from '@nestjs/common';
import type { SettlementDetails } from '@/modules/settlements/application/dtos/settlement-details.dto.js';
import { toSettlementDetails } from '@/modules/settlements/application/dtos/settlement-details.mapper.js';
import { SettlementNotFoundError } from '@/modules/settlements/domain/errors/settlement-not-found.error.js';
import type { DailySettlementRepository } from '@/modules/settlements/domain/repositories/daily-settlement.repository.js';
import { DAILY_SETTLEMENT_REPOSITORY } from '@/modules/settlements/domain/tokens/daily-settlement-repository.token.js';

/** Un cuadre por id, del prestamista de la sesión. Cualquier rol puede verlo. */
@Injectable()
export class GetSettlementUseCase {
  constructor(
    @Inject(DAILY_SETTLEMENT_REPOSITORY)
    private readonly settlements: DailySettlementRepository,
  ) {}

  /**
   * @param id - Identificador del cuadre.
   * @param lenderId - El prestamista dueño.
   * @throws {@link SettlementNotFoundError} Si el cuadre no existe, o es de otro prestamista.
   */
  async execute(id: string, lenderId: string): Promise<SettlementDetails> {
    const settlement = await this.settlements.findById(id, lenderId);
    if (settlement === null) {
      throw new SettlementNotFoundError();
    }
    return toSettlementDetails(settlement);
  }
}
