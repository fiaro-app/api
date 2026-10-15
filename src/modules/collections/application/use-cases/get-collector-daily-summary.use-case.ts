import { toBusinessDate } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import type {
  CollectorDailySummary,
  GetCollectorDailySummaryInput,
} from '@/modules/collections/application/dtos/collector-daily-summary.dto.js';
import type { CollectionVisitRecord } from '@/modules/collections/domain/repositories/collection-visit-record.js';
import { toCollectionVisitDetails } from '@/modules/collections/application/dtos/collection-visit-details.mapper.js';
import { sumNetPaymentsByMethod } from '@/modules/collections/application/services/sum-net-payments-by-method.js';
import { computeExpectedForDay } from '@/modules/collections/application/services/compute-expected-for-day.js';
import { groupRecordsByLoan } from '@/modules/collections/application/services/group-records-by-loan.js';
import type { LoanPortfolioReadRepository } from '@/modules/collections/domain/repositories/loan-portfolio-read.repository.js';
import { LOAN_PORTFOLIO_READ_REPOSITORY } from '@/modules/collections/domain/tokens/loan-portfolio-read-repository.token.js';
import type { CollectionAssignmentRepository } from '@/modules/collections/domain/repositories/collection-assignment.repository.js';
import type { CollectionVisitRepository } from '@/modules/collections/domain/repositories/collection-visit.repository.js';
import { COLLECTION_ASSIGNMENT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-assignment-repository.token.js';
import { COLLECTION_VISIT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-visit-repository.token.js';
import { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';
import { ListLoansUseCase } from '@/modules/loans/application/use-cases/list-loans.use-case.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/**
 * El resumen del día de un cobrador, antes de confirmar su cuadre (PROTOTIPO-FLUJOS.md §4.4,
 * D-98): lo que esperaba cobrar, lo que de verdad cobró y el historial de sus visitas.
 *
 * @remarks
 * `expectedAmount` no suma `CollectionVisit.expectedAmount` de las visitas que ya hizo: usa el
 * motor de calendario sobre los préstamos `ACTIVE` que tiene asignados hoy
 * ({@link computeExpectedAmountInRange}), para que la cifra muestre lo que todavía le falta
 * cobrar mientras sigue en ruta, no solo lo ya visitado. `collectedAmount` sí es un hecho: la
 * suma de los pagos sin reversión que de verdad registró ese día. El cuerpo que arma
 * `POST /daily-settlements` (D-86) no reusa este caso de uso: aquel pide los montos al cliente
 * (PRODUCT.md §5, D-36), este los calcula para que el cliente los muestre antes de enviarlos.
 */
@Injectable()
export class GetCollectorDailySummaryUseCase {
  constructor(
    @Inject(COLLECTION_ASSIGNMENT_REPOSITORY)
    private readonly assignments: CollectionAssignmentRepository,
    @Inject(COLLECTION_VISIT_REPOSITORY)
    private readonly visits: CollectionVisitRepository,
    private readonly listLoans: ListLoansUseCase,
    private readonly getLender: GetLenderUseCase,
    @Inject(LOAN_PORTFOLIO_READ_REPOSITORY)
    private readonly portfolio: LoanPortfolioReadRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** @param input - El cobrador, el prestamista y la fecha (hoy, si no llega). */
  async execute(
    input: GetCollectorDailySummaryInput,
  ): Promise<CollectorDailySummary> {
    const date = input.date ?? toBusinessDate(this.clock.now());
    const [assigned, records, lender] = await Promise.all([
      this.assignments.findActiveByCollectorAndDate(
        input.collectorMembershipId,
        date,
      ),
      this.visits.listByCollectorAndDateRange(
        input.collectorMembershipId,
        date,
        date,
      ),
      this.getLender.execute(input.lenderId),
    ]);

    const loans = await this.activeLoans(
      assigned.map((assignment) => assignment.loanId),
      input.lenderId,
      date,
    );
    const recordsByLoan = groupRecordsByLoan(
      await this.portfolio.listVisitRecordsByLoans(loans.map((l) => l.id)),
    );
    const expectedAmount = loans.reduce(
      (sum, loan) =>
        sum +
        computeExpectedForDay(
          loan,
          lender,
          recordsByLoan.get(loan.id) ?? [],
          date,
        ),
      0,
    );

    const collectedByMethod = sumNetPaymentsByMethod(records);
    return {
      date,
      expectedAmount,
      routeLoans: loans.length,
      visitedLoans: countVisited(loans, records),
      collectedAmount:
        collectedByMethod.CASH +
        collectedByMethod.NEQUI +
        collectedByMethod.TRANSFER,
      collectedByMethod,
      visits: records.map(toCollectionVisitDetails),
    };
  }

  /**
   * Los préstamos activos entre los asignados, en una sola consulta.
   *
   * @param loanIds - Los préstamos asignados ese día.
   * @param lenderId - El prestamista dueño.
   */
  private async activeLoans(
    loanIds: readonly string[],
    lenderId: string,
    date: string,
  ): Promise<readonly LoanDetails[]> {
    if (loanIds.length === 0) {
      return [];
    }
    const page = await this.listLoans.execute({
      lenderId,
      ids: loanIds,
      page: 1,
      pageSize: loanIds.length,
    });
    return page.items.filter(
      (loan) =>
        loan.status === 'ACTIVE' ||
        (loan.status === 'PAID_OFF' &&
          loan.closedAt !== null &&
          toBusinessDate(loan.closedAt) >= date),
    );
  }
}

/**
 * @param loans - Los préstamos en la ruta de hoy.
 * @param records - Las visitas de hoy.
 * @returns Cuántos de esos préstamos tuvieron al menos una visita.
 */
function countVisited(
  loans: readonly LoanDetails[],
  records: readonly CollectionVisitRecord[],
): number {
  const visited = new Set(records.map((record) => record.visit.loanId));
  return loans.filter((loan) => visited.has(loan.id)).length;
}
