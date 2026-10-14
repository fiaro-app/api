import { toBusinessDate } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import { GetLoanUseCase } from '@/modules/loans/application/use-cases/get-loan.use-case.js';
import type { LoanBalanceDetails } from '@/modules/collections/application/dtos/loan-balance.dto.js';
import { calculateLoanBalance } from '@/modules/collections/application/services/calculate-loan-balance.js';
import type { CollectionVisitRepository } from '@/modules/collections/domain/repositories/collection-visit.repository.js';
import { COLLECTION_VISIT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-visit-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/**
 * Calcula el estado financiero (saldo, mora, próxima fecha esperada) de un préstamo del
 * prestamista de la sesión. Cualquier rol puede verlo, igual que `GET /loans/:id`.
 *
 * @remarks
 * Compone tres fuentes para alimentar el motor de calendario/mora puro
 * (`shared/domain/calendar/loan-balance.ts`): el préstamo (`GetLoanUseCase`, de `loans`), los
 * días sin cobro del prestamista (`GetLenderUseCase`, de `lenders`, vía `toLoanScheduleInput`,
 * que también usan las estadísticas de cobro, D-98) y lo pagado de verdad hasta ahora
 * (`sumNetPayments` sobre `CollectionVisitRepository.listByLoan`, de este mismo módulo: un pago
 * con reversión no cuenta, D-85). Vive en `collections`, no en
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
   * @remarks
   * Con `asOf` calcula el saldo histórico de una fecha pasada (D-111); ver
   * {@link calculateLoanBalance}.
   *
   * @param loanId - El préstamo.
   * @param lenderId - El prestamista dueño, tal como lo resolvió `LenderScopeGuard`.
   * @param asOf - Fecha (`AAAA-MM-DD`) para la que se calcula; ausente para hoy.
   * @returns Su estado financiero.
   * @throws {@link LoanNotFoundError} Si el préstamo no existe, o es de otro prestamista.
   */
  async execute(
    loanId: string,
    lenderId: string,
    asOf?: string,
  ): Promise<LoanBalanceDetails> {
    const loan = await this.getLoan.execute(loanId, lenderId);
    const lender = await this.getLender.execute(lenderId);
    const records = await this.visits.listByLoan(loanId);

    return calculateLoanBalance({
      loan,
      lender,
      records,
      today: toBusinessDate(this.clock.now()),
      asOf,
    });
  }
}
