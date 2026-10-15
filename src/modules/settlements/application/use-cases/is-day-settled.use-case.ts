import { Inject, Injectable } from '@nestjs/common';
import type { DailySettlementRepository } from '@/modules/settlements/domain/repositories/daily-settlement.repository.js';
import { DAILY_SETTLEMENT_REPOSITORY } from '@/modules/settlements/domain/tokens/daily-settlement-repository.token.js';

/**
 * Si el día de un cobrador está cerrado para cobrar: su cuadre de esa fecha está en revisión
 * (`PENDING`) o aprobado (`APPROVED`) (D-130). Con el cuadre rechazado, o sin cuadre, puede seguir
 * cobrando. Lo usa `collections` antes de registrar una visita.
 */
@Injectable()
export class IsDaySettledUseCase {
  constructor(
    @Inject(DAILY_SETTLEMENT_REPOSITORY)
    private readonly settlements: DailySettlementRepository,
  ) {}

  /**
   * @param collectorMembershipId - El cobrador.
   * @param date - La fecha del cobro (`AAAA-MM-DD`, hora de Colombia).
   */
  async execute(collectorMembershipId: string, date: string): Promise<boolean> {
    const settlement = await this.settlements.findByCollectorAndDate(
      collectorMembershipId,
      date,
    );
    return settlement !== null && settlement.status !== 'REJECTED';
  }
}
