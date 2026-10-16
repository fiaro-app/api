import { Inject, Injectable } from '@nestjs/common';
import type { LoanRepository } from '@/modules/loans/domain/repositories/loan.repository.js';
import { LOAN_REPOSITORY } from '@/modules/loans/domain/tokens/loan-repository.token.js';

/** Cuántos préstamos `ACTIVE` tiene un prestamista: el uso del plan, que muestra `subscriptions`. */
@Injectable()
export class CountActiveLoansUseCase {
  constructor(
    @Inject(LOAN_REPOSITORY) private readonly loans: LoanRepository,
  ) {}

  /** @param lenderId - El prestamista. */
  async execute(lenderId: string): Promise<number> {
    return await this.loans.countActive(lenderId);
  }
}
