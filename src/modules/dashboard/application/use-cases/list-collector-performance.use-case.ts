import { toBusinessDate } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import type {
  LenderStatsCollectorPerformance,
  LenderStatsPage,
  ListCollectorPerformanceInput,
} from '@/modules/dashboard/application/dtos/lender-stats.dto.js';
import {
  filterStatsCollectors,
  LenderStatsScope,
  toPerformance,
} from '@/modules/dashboard/application/services/lender-stats-scope.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import { startOfBusinessMonth } from '@/shared/domain/calendar/business-date.js';

/**
 * El desempeño de todos los cobradores activos, paginado: el resumen de las estadísticas trae
 * solo los primeros cinco. Mismo orden (del más antiguo al más nuevo) que el resumen; las métricas
 * se calculan solo para los cobradores de la página, que es lo caro.
 */
@Injectable()
export class ListCollectorPerformanceUseCase {
  constructor(
    private readonly scope: LenderStatsScope,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** @param input - El prestamista, el período (el mes actual, si no llega), la cartera y la página. */
  async execute(
    input: ListCollectorPerformanceInput,
  ): Promise<LenderStatsPage<LenderStatsCollectorPerformance>> {
    const today = toBusinessDate(this.clock.now());
    const period = {
      from: input.from ?? startOfBusinessMonth(today),
      to: input.to ?? today,
    };
    const collectors = filterStatsCollectors(
      await this.scope.activeCollectors(input.lenderId),
      input,
    );
    const start = (input.page - 1) * input.pageSize;
    const page = collectors.slice(start, start + input.pageSize);
    const stats = await this.scope.collectorStats(page, input.lenderId, period);
    return {
      items: page.map((collector, index) =>
        toPerformance(collector, stats[index]),
      ),
      total: collectors.length,
    };
  }
}
