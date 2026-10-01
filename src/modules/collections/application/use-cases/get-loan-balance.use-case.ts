import { toBusinessDate } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import { GetLoanUseCase } from '@/modules/loans/application/use-cases/get-loan.use-case.js';
import type { LoanBalanceDetails } from '@/modules/collections/application/dtos/loan-balance.dto.js';
import { toLoanBalanceDetails } from '@/modules/collections/application/dtos/loan-balance.mapper.js';
import type { CollectionVisitRepository } from '@/modules/collections/domain/repositories/collection-visit.repository.js';
import { COLLECTION_VISIT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-visit-repository.token.js';
import { computeLoanBalance } from '@/shared/domain/calendar/loan-balance.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/**
 * Calcula el estado financiero (saldo, mora, próxima fecha esperada) de un préstamo del
 * prestamista de la sesión. Cualquier rol puede verlo, igual que `GET /loans/:id`.
 *
 * @remarks
 * Compone tres fuentes para alimentar el motor de calendario/mora puro
 * (`shared/domain/calendar/loan-balance.ts`): el préstamo (`GetLoanUseCase`, de `loans`), los
 * días sin cobro del prestamista (`GetLenderUseCase`, de `lenders`) y lo pagado hasta ahora
 * (`CollectionVisitRepository.listByLoan`, de este mismo módulo). Vive en `collections`, no en
 * `loans`, porque `loans` no puede depender de `collections` sin crear un ciclo de módulos
 * (`collections` ya depende de `loans` para validar el préstamo al asignar y al registrar una
 * visita); `lenders` no depende de ningún otro módulo, así que sumar esa dependencia aquí es
 * segura. No usa `NonWorkingDay` (cierres puntuales): esa entidad todavía no existe en la API, así
 * que hoy solo cuentan los días de la semana sin cobro y, si aplica, los festivos nacionales.
 */
@Injectable()
export class GetLoanBalanceUseCase {
  constructor(
    @Inject(COLLECTION_VISIT_REPOSITORY)
    private readonly visits: CollectionVisitRepository,
    private readonly getLoan: GetLoanUseCase,
    private readonly getLender: GetLenderUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param loanId - El préstamo.
   * @param lenderId - El prestamista dueño, tal como lo resolvió `LenderScopeGuard`.
   * @returns Su estado financiero, calculado con la fecha de hoy.
   * @throws {@link LoanNotFoundError} Si el préstamo no existe, o es de otro prestamista.
   */
  async execute(loanId: string, lenderId: string): Promise<LoanBalanceDetails> {
    const loan = await this.getLoan.execute(loanId, lenderId);
    const lender = await this.getLender.execute(lenderId);
    const records = await this.visits.listByLoan(loanId);

    const totalPaid = records.reduce(
      (sum, record) => sum + (record.payment?.amount ?? 0),
      0,
    );
    const asOf = toBusinessDate(this.clock.now());

    const balance = computeLoanBalance({
      startDate: loan.startDate,
      frequency: loan.frequency,
      installmentCount: loan.installmentCount,
      installmentValue: loan.installmentValue,
      totalPayable: loan.totalPayable,
      nonWorkingWeekdays: lender.nonWorkingWeekdays,
      skipNationalHolidays: lender.skipNationalHolidays,
      totalPaid,
      asOf,
      isClosed: loan.status !== 'ACTIVE',
    });

    return toLoanBalanceDetails(loanId, asOf, balance);
  }
}
