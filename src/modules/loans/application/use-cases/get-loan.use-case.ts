import { Inject, Injectable } from '@nestjs/common';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';
import { toLoanDetails } from '@/modules/loans/application/dtos/loan-details.mapper.js';
import { LoanNotFoundError } from '@/modules/loans/domain/errors/loan-not-found.error.js';
import type { LoanRepository } from '@/modules/loans/domain/repositories/loan.repository.js';
import { LOAN_REPOSITORY } from '@/modules/loans/domain/tokens/loan-repository.token.js';

/**
 * Consulta un préstamo del prestamista de la sesión. Cualquier rol puede verlo (le sirve al
 * Collector para su trabajo en campo); solo el controller restringe crear.
 */
@Injectable()
export class GetLoanUseCase {
  constructor(
    @Inject(LOAN_REPOSITORY) private readonly loans: LoanRepository,
  ) {}

  /**
   * @param id - El préstamo.
   * @param lenderId - El prestamista dueño, tal como lo resolvió `LenderScopeGuard`.
   * @returns Sus datos públicos.
   * @throws {@link LoanNotFoundError} Si no existe, o es de otro prestamista.
   */
  async execute(id: string, lenderId: string): Promise<LoanDetails> {
    const loan = await this.loans.findById(id, lenderId);
    if (loan === null) {
      throw new LoanNotFoundError(id);
    }
    return toLoanDetails(loan);
  }
}
