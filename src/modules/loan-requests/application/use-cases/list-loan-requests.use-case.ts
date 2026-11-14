import { Inject, Injectable } from '@nestjs/common';
import type {
  ListLoanRequestsInput,
  LoanRequestsPageResult,
} from '@/modules/loan-requests/application/dtos/loan-request-details.dto.js';
import { toLoanRequestDetails } from '@/modules/loan-requests/application/dtos/loan-request-details.mapper.js';
import type { LoanRequestRepository } from '@/modules/loan-requests/domain/repositories/loan-request.repository.js';
import { LOAN_REQUEST_REPOSITORY } from '@/modules/loan-requests/domain/tokens/loan-request-repository.token.js';

/** Lista las solicitudes de préstamo del prestamista, de la más nueva a la más antigua. */
@Injectable()
export class ListLoanRequestsUseCase {
  constructor(
    @Inject(LOAN_REQUEST_REPOSITORY)
    private readonly requests: LoanRequestRepository,
  ) {}

  /** @param input - El prestamista, la paginación y los filtros opcionales. */
  async execute(input: ListLoanRequestsInput): Promise<LoanRequestsPageResult> {
    const page = await this.requests.list(input);
    return { items: page.items.map(toLoanRequestDetails), total: page.total };
  }
}
