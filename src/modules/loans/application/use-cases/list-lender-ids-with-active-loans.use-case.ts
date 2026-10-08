import { Inject, Injectable } from '@nestjs/common';
import type { LoanRepository } from '@/modules/loans/domain/repositories/loan.repository.js';
import { LOAN_REPOSITORY } from '@/modules/loans/domain/tokens/loan-repository.token.js';

/**
 * Los prestamistas que tienen al menos un préstamo activo. Lo usa el aviso diario de mora (D-96),
 * que no corre con una sesión y por eso recorre a todos los prestamistas: cada uno después se
 * consulta con su propio `lenderId`, como cualquier otra lectura.
 */
@Injectable()
export class ListLenderIdsWithActiveLoansUseCase {
  constructor(
    @Inject(LOAN_REPOSITORY) private readonly loans: LoanRepository,
  ) {}

  /** @returns Los identificadores de los prestamistas con préstamos `ACTIVE`, sin repetir. */
  async execute(): Promise<readonly string[]> {
    return this.loans.listLenderIdsWithStatus('ACTIVE');
  }
}
