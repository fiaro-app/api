import { toBusinessDate } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import type {
  GetLenderInsightsInput,
  LenderInsights,
} from '@/modules/dashboard/application/dtos/lender-insights.dto.js';
import { expectedByDay } from '@/modules/dashboard/application/services/expected-by-day.js';
import {
  assembleInsights,
  FORECAST_DAYS,
} from '@/modules/dashboard/application/services/assemble-insights.js';
import { fetchAllPages } from '@/modules/dashboard/application/services/fetch-all-pages.js';
import { endOfBusinessDay } from '@/modules/dashboard/application/services/loan-portfolio-snapshot.service.js';
import type { InsightsReadRepository } from '@/modules/dashboard/domain/repositories/insights-read.repository.js';
import { INSIGHTS_READ_REPOSITORY } from '@/modules/dashboard/domain/repositories/insights-read.token.js';
import { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';
import { ListLoansUseCase } from '@/modules/loans/application/use-cases/list-loans.use-case.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import {
  addDays,
  previousPeriod,
  startOfBusinessMonth,
} from '@/shared/domain/calendar/business-date.js';

const PAGE_SIZE = 100;

/**
 * Las estadísticas del negocio para el prestamista (D-133): la serie diaria de cobro contra lo que
 * vencía, cuánto de lo cobrado es ganancia (interés) y capital, cuánto se prestó, cómo van las
 * visitas y los cuadres, y lo que vence en los próximos 7 días; todo con el período anterior para
 * ver la tendencia.
 *
 * @remarks
 * Lo cobrado, los intereses, las visitas, los cuadres y lo colocado salen de sumas hechas en la
 * base (`InsightsReadRepository`). Lo que «vencía» sale del mismo motor de calendario de siempre,
 * sobre los préstamos que estuvieron abiertos al empezar o al terminar el período (más los
 * activos hoy, para la proyección): un préstamo que nace y se cierra dentro del período no suma a
 * lo esperado de la serie. No se mezcla con lo esperado del cuadre (que incluye la mora): aquí es
 * lo programado por el calendario.
 */
@Injectable()
export class GetLenderInsightsUseCase {
  constructor(
    @Inject(INSIGHTS_READ_REPOSITORY)
    private readonly insights: InsightsReadRepository,
    private readonly listLoans: ListLoansUseCase,
    private readonly getLender: GetLenderUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** @param input - El prestamista y el período (por defecto, el mes hasta hoy). */
  async execute(input: GetLenderInsightsInput): Promise<LenderInsights> {
    const today = toBusinessDate(this.clock.now());
    const to = input.to ?? today;
    const from = input.from ?? startOfBusinessMonth(to);
    const previous = previousPeriod({ from, to });
    const { lenderId } = input;

    const [
      lender,
      loans,
      payments,
      income,
      origination,
      visits,
      settlements,
      before,
      beforeOrigination,
    ] = await Promise.all([
      this.getLender.execute(lenderId),
      this.loansForCalendar(lenderId, from, to, today),
      this.insights.paymentsByDay(lenderId, from, to),
      this.insights.income(lenderId, from, to),
      this.insights.originations(lenderId, from, to),
      this.insights.visitOutcomes(lenderId, from, to),
      this.insights.settlements(lenderId, from, to),
      this.insights.income(lenderId, previous.from, previous.to),
      this.insights.originations(lenderId, previous.from, previous.to),
    ]);

    return assembleInsights({
      period: { from, to },
      previous,
      today,
      expected: expectedByDay(loans, lender, from, to),
      upcoming: expectedByDay(
        loans,
        lender,
        addDays(today, 1),
        addDays(today, FORECAST_DAYS),
      ),
      payments,
      income,
      origination,
      visits,
      settlements,
      before,
      beforeOrigination,
    });
  }

  /** Los préstamos abiertos al empezar o al terminar el período y hoy, sin repetir. */
  private async loansForCalendar(
    lenderId: string,
    from: string,
    to: string,
    today: string,
  ): Promise<readonly LoanDetails[]> {
    const instants = [
      new Date(`${from}T05:00:00.000Z`),
      endOfBusinessDay(to),
      endOfBusinessDay(today),
    ];
    const lists = await Promise.all(
      instants.map((openAt) =>
        fetchAllPages<LoanDetails>(PAGE_SIZE, (page) =>
          this.listLoans.execute({
            lenderId,
            openAt,
            page,
            pageSize: PAGE_SIZE,
          }),
        ),
      ),
    );
    return [...new Map(lists.flat().map((loan) => [loan.id, loan])).values()];
  }
}
