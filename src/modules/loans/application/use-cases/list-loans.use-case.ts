import { Inject, Injectable } from '@nestjs/common';
import type {
  ListLoansInput,
  LoansPageResult,
} from '@/modules/loans/application/dtos/loan-details.dto.js';
import { toLoanDetails } from '@/modules/loans/application/dtos/loan-details.mapper.js';
import type { LoanRepository } from '@/modules/loans/domain/repositories/loan.repository.js';
import { LOAN_REPOSITORY } from '@/modules/loans/domain/tokens/loan-repository.token.js';

/** Lista, paginados, los préstamos del prestamista de la sesión. Cualquier rol puede verla. */
@Injectable()
export class ListLoansUseCase {
  constructor(
    @Inject(LOAN_REPOSITORY) private readonly loans: LoanRepository,
  ) {}

  /** @param input - El prestamista dueño, la paginación y los filtros opcionales. */
  async execute(input: ListLoansInput): Promise<LoansPageResult> {
    const page = await this.loans.list(input);
    return {
      items: page.items.map(toLoanDetails),
      total: page.total,
    };
  }
}
