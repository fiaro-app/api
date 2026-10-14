import { toBusinessDate } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import type {
  CollectorPeriodStats,
  GetCollectorStatsInput,
} from '@/modules/collections/application/dtos/collector-period-stats.dto.js';
import { sumNetPayments } from '@/modules/collections/application/services/sum-net-payments.js';
import { toLoanScheduleInput } from '@/modules/collections/application/services/to-loan-schedule-input.js';
import { ListLoanBalancesUseCase } from '@/modules/collections/application/use-cases/list-loan-balances.use-case.js';
import type { CollectionAssignmentRepository } from '@/modules/collections/domain/repositories/collection-assignment.repository.js';
import type { CollectionVisitRepository } from '@/modules/collections/domain/repositories/collection-visit.repository.js';
import { COLLECTION_ASSIGNMENT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-assignment-repository.token.js';
import { COLLECTION_VISIT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-visit-repository.token.js';
import { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';
import { ListLoansUseCase } from '@/modules/loans/application/use-cases/list-loans.use-case.js';
import { startOfBusinessMonth } from '@/shared/domain/calendar/business-date.js';
import { computeExpectedAmountInRange } from '@/shared/domain/calendar/period-expected.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/**
 * Métricas personales de desempeño de un cobrador en un período (PROTOTIPO-FLUJOS.md §4.4, D-98):
 * las mismas que ve el Lender sobre él en `QUERY /lenders/me/stats` (D-100).
 *
 * @remarks
 * `expectedAmount` y `overdueAmount` son "de su cartera": los préstamos `ACTIVE` que tiene
 * asignados **hoy**, no los que tenía el día `to` si ya cambiaron — mismo criterio que el aviso
 * diario de mora (D-96). `effectiveness` compara eso con lo que de verdad cobró en el período
 * (`collectedAmount`, de las visitas que él mismo registró, sea cual sea el préstamo): un
 * cobrador no puede mejorar su cifra simplemente dejando de visitar los casos difíciles, porque
 * lo esperado no depende de si visitó o no.
 */
@Injectable()
export class GetCollectorStatsUseCase {
  constructor(
    @Inject(COLLECTION_ASSIGNMENT_REPOSITORY)
    private readonly assignments: CollectionAssignmentRepository,
    @Inject(COLLECTION_VISIT_REPOSITORY)
    private readonly visits: CollectionVisitRepository,
    private readonly listLoans: ListLoansUseCase,
    private readonly getLender: GetLenderUseCase,
    private readonly listLoanBalances: ListLoanBalancesUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** @param input - El cobrador, el prestamista y el rango (el mes actual, si no llega). */
  async execute(input: GetCollectorStatsInput): Promise<CollectorPeriodStats> {
    const today = toBusinessDate(this.clock.now());
    const from = input.from ?? startOfBusinessMonth(today);
    const to = input.to ?? today;

    const [assigned, records, lender] = await Promise.all([
      this.assignments.findActiveByCollectorAndDate(
        input.collectorMembershipId,
        today,
      ),
      this.visits.listByCollectorAndDateRange(
        input.collectorMembershipId,
        from,
        to,
      ),
      this.getLender.execute(input.lenderId),
    ]);

    const activeLoans = await this.activeLoans(
      assigned.map((assignment) => assignment.loanId),
      input.lenderId,
    );

    const expectedAmount = activeLoans.reduce(
      (sum, loan) =>
        sum +
        computeExpectedAmountInRange(
          toLoanScheduleInput(loan, lender),
          from,
          to,
        ),
      0,
    );
    const collectedAmount = sumNetPayments(records);
    const overdueAmount = await this.sumOverdueAmount(
      activeLoans,
      input.lenderId,
      today,
    );

    return {
      from,
      to,
      expectedAmount,
      collectedAmount,
      effectiveness:
        expectedAmount === 0 ? null : collectedAmount / expectedAmount,
      visitsCount: records.length,
      overdueAmount,
    };
  }

  /**
   * @param activeLoans - Los préstamos `ACTIVE` que el cobrador tiene asignados hoy.
   * @param lenderId - El prestamista dueño.
   * @returns Lo vencido y sin pagar hoy, sumado entre esos préstamos.
   */
  private async sumOverdueAmount(
    activeLoans: readonly LoanDetails[],
    lenderId: string,
    today: string,
  ): Promise<number> {
    const balances = await this.listLoanBalances.execute({
      lenderId,
      loans: activeLoans,
      day: today,
    });
    return [...balances.values()].reduce(
      (sum, balance) => sum + balance.overdueAmount,
      0,
    );
  }

  /**
   * Los préstamos activos entre los asignados, en una sola consulta.
   *
   * @param loanIds - Los préstamos que el cobrador tiene asignados hoy.
   * @param lenderId - El prestamista dueño.
   */
  private async activeLoans(
    loanIds: readonly string[],
    lenderId: string,
  ): Promise<readonly LoanDetails[]> {
    if (loanIds.length === 0) {
      return [];
    }
    const page = await this.listLoans.execute({
      lenderId,
      ids: loanIds,
      status: 'ACTIVE',
      page: 1,
      pageSize: loanIds.length,
    });
    return page.items;
  }
}
