import { Inject, Injectable } from '@nestjs/common';
import type {
  ListSettlementsInput,
  SettlementsPageResult,
} from '@/modules/settlements/application/dtos/settlement-details.dto.js';
import { toSettlementDetails } from '@/modules/settlements/application/dtos/settlement-details.mapper.js';
import type { DailySettlementRepository } from '@/modules/settlements/domain/repositories/daily-settlement.repository.js';
import { DAILY_SETTLEMENT_REPOSITORY } from '@/modules/settlements/domain/tokens/daily-settlement-repository.token.js';

/** Lista, paginados, los cuadres del prestamista de la sesión. Cualquier rol puede verla. */
@Injectable()
export class ListSettlementsUseCase {
  constructor(
    @Inject(DAILY_SETTLEMENT_REPOSITORY)
    private readonly settlements: DailySettlementRepository,
  ) {}

  /** @param input - El prestamista dueño, la paginación y los filtros opcionales. */
  async execute(input: ListSettlementsInput): Promise<SettlementsPageResult> {
    const page = await this.settlements.list(input);
    return {
      items: page.items.map(toSettlementDetails),
      total: page.total,
    };
  }
}
