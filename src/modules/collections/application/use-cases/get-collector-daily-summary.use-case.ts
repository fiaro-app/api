import { toBusinessDate } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import type {
  CollectorDailySummary,
  GetCollectorDailySummaryInput,
} from '@/modules/collections/application/dtos/collector-daily-summary.dto.js';
import { toCollectionVisitDetails } from '@/modules/collections/application/dtos/collection-visit-details.mapper.js';
import { sumNetPaymentsByMethod } from '@/modules/collections/application/services/sum-net-payments-by-method.js';
import { toLoanScheduleInput } from '@/modules/collections/application/services/to-loan-schedule-input.js';
import type { CollectionAssignmentRepository } from '@/modules/collections/domain/repositories/collection-assignment.repository.js';
import type { CollectionVisitRepository } from '@/modules/collections/domain/repositories/collection-visit.repository.js';
import { COLLECTION_ASSIGNMENT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-assignment-repository.token.js';
import { COLLECTION_VISIT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-visit-repository.token.js';
import { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import { GetLoanUseCase } from '@/modules/loans/application/use-cases/get-loan.use-case.js';
import { computeExpectedAmountInRange } from '@/shared/domain/calendar/period-expected.js';
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
    private readonly getLoan: GetLoanUseCase,
    private readonly getLender: GetLenderUseCase,
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

    const loans = await Promise.all(
      assigned.map((assignment) =>
        this.getLoan.execute(assignment.loanId, input.lenderId),
      ),
    );
    const expectedAmount = loans
      .filter((loan) => loan.status === 'ACTIVE')
      .reduce(
        (sum, loan) =>
          sum +
          computeExpectedAmountInRange(
            toLoanScheduleInput(loan, lender),
            date,
            date,
          ),
        0,
      );

    const collectedByMethod = sumNetPaymentsByMethod(records);
    return {
      date,
      expectedAmount,
      collectedAmount:
        collectedByMethod.CASH +
        collectedByMethod.NEQUI +
        collectedByMethod.TRANSFER,
      collectedByMethod,
      visits: records.map(toCollectionVisitDetails),
    };
  }
}
