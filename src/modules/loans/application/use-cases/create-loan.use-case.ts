import { Inject, Injectable } from '@nestjs/common';
import { GetClientUseCase } from '@/modules/clients/application/use-cases/get-client.use-case.js';
import type {
  CreateLoanInput,
  LoanDetails,
} from '@/modules/loans/application/dtos/loan-details.dto.js';
import { toLoanDetails } from '@/modules/loans/application/dtos/loan-details.mapper.js';
import type { ActiveLoanLimit } from '@/modules/loans/application/ports/active-loan-limit.port.js';
import { ACTIVE_LOAN_LIMIT } from '@/modules/loans/application/ports/active-loan-limit.token.js';
import { validateLoanData } from '@/modules/loans/application/services/loan-data.validator.js';
import { ActiveLoanLimitReachedError } from '@/modules/loans/domain/errors/active-loan-limit-reached.error.js';
import { Loan } from '@/modules/loans/domain/entities/loan.entity.js';
import type { LoanRepository } from '@/modules/loans/domain/repositories/loan.repository.js';
import { LOAN_REPOSITORY } from '@/modules/loans/domain/tokens/loan-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import type { LenderLock } from '@/shared/application/ports/lender-lock.port.js';
import { LENDER_LOCK } from '@/shared/application/ports/lender-lock.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';

/**
 * Da de alta un préstamo para un cliente del prestamista de la sesión. Nace `ACTIVE`: cancelarlo
 * es un caso de uso aparte (no existe todavía). Respeta el tope de préstamos activos del plan (D-146). Quién puede llamarlo lo decide el controller
 * (`hasAnyRole`, `OWNER`/`LENDER` — PRODUCT.md §5, "solo el Lender crea préstamos").
 */
@Injectable()
export class CreateLoanUseCase {
  constructor(
    @Inject(LOAN_REPOSITORY) private readonly loans: LoanRepository,
    private readonly getClientUseCase: GetClientUseCase,
    @Inject(ACTIVE_LOAN_LIMIT) private readonly limit: ActiveLoanLimit,
    @Inject(LENDER_LOCK) private readonly lenderLock: LenderLock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param input - El prestamista y la membresía de quien lo da de alta, y los datos del
   * préstamo.
   * @returns El préstamo creado.
   * @throws {@link ClientNotFoundError} Si el cliente no existe, o es de otro prestamista.
   * @throws {@link InvalidLoanDataError} Si algún dato no cumple el contrato.
   * @throws {@link ActiveLoanLimitReachedError} Si el plan ya tiene todos sus préstamos activos.
   */
  async execute(input: CreateLoanInput): Promise<LoanDetails> {
    await this.getClientUseCase.execute(input.clientId, input.lenderId);
    const data = validateLoanData(input);
    return this.lenderLock.runExclusive(input.lenderId, () =>
      this.createExclusively(input, data),
    );
  }

  /** El alta en sí, con el candado del prestamista tomado: contar y crear no es atómico. */
  private async createExclusively(
    input: CreateLoanInput,
    data: ReturnType<typeof validateLoanData>,
  ): Promise<LoanDetails> {
    const max = await this.limit.maxActiveLoans(input.lenderId);
    if (max !== null && (await this.loans.countActive(input.lenderId)) >= max) {
      throw new ActiveLoanLimitReachedError(max);
    }

    const loan = Loan.create({
      id: this.ids.next(),
      lenderId: input.lenderId,
      clientId: input.clientId,
      ...data,
      status: 'ACTIVE',
      createdByMembershipId: input.membershipId,
      createdAt: this.clock.now(),
      closedAt: null,
    });
    await this.loans.create(loan);
    return toLoanDetails(loan);
  }
}
