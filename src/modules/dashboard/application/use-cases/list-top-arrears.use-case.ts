import { toBusinessDate } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import type {
  LenderStatsPage,
  LenderStatsTopArrearsEntry,
  ListTopArrearsInput,
} from '@/modules/dashboard/application/dtos/lender-stats.dto.js';
import {
  filterStatsRecords,
  LenderStatsScope,
} from '@/modules/dashboard/application/services/lender-stats-scope.js';
import { LoanPortfolioSnapshotService } from '@/modules/dashboard/application/services/loan-portfolio-snapshot.service.js';
import { rankTopArrears } from '@/modules/dashboard/domain/arrears-stats.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/**
 * El ranking completo de clientes con mayor mora, paginado: el resumen de las estadísticas trae
 * solo los primeros cinco. Mismo orden (más días de atraso, luego más monto vencido) y mismos
 * filtros que `GetLenderStatsUseCase`; el nombre del cliente se busca solo para la página pedida.
 */
@Injectable()
export class ListTopArrearsUseCase {
  constructor(
    private readonly snapshots: LoanPortfolioSnapshotService,
    private readonly scope: LenderStatsScope,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** @param input - El prestamista, los filtros y la página. */
  async execute(
    input: ListTopArrearsInput,
  ): Promise<LenderStatsPage<LenderStatsTopArrearsEntry>> {
    const today = toBusinessDate(this.clock.now());
    const [collectors, records] = await Promise.all([
      this.scope.activeCollectors(input.lenderId),
      this.snapshots.current(input.lenderId, today),
    ]);
    const overdue = filterStatsRecords(records, collectors, input).filter(
      (record) => record.overdueAmount > 0,
    );
    const ranked = rankTopArrears(overdue, Number.POSITIVE_INFINITY);
    const start = (input.page - 1) * input.pageSize;
    return {
      items: await this.scope.withClientNames(
        ranked.slice(start, start + input.pageSize),
        input.lenderId,
      ),
      total: ranked.length,
    };
  }
}
