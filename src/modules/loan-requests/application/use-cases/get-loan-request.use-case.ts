import { Inject, Injectable } from '@nestjs/common';
import type { LoanRequestDetails } from '@/modules/loan-requests/application/dtos/loan-request-details.dto.js';
import { toLoanRequestDetails } from '@/modules/loan-requests/application/dtos/loan-request-details.mapper.js';
import { LoanRequestNotFoundError } from '@/modules/loan-requests/domain/errors/loan-request-not-found.error.js';
import type { LoanRequestRepository } from '@/modules/loan-requests/domain/repositories/loan-request.repository.js';
import { LOAN_REQUEST_REPOSITORY } from '@/modules/loan-requests/domain/tokens/loan-request-repository.token.js';

/** Consulta una solicitud de préstamo del prestamista; un cobrador solo ve las suyas. */
@Injectable()
export class GetLoanRequestUseCase {
  constructor(
    @Inject(LOAN_REQUEST_REPOSITORY)
    private readonly requests: LoanRequestRepository,
  ) {}

  /**
   * @param id - La solicitud.
   * @param lenderId - El prestamista dueño.
   * @param requestedByMembershipId - Si viene, la solicitud debe ser de ese cobrador.
   * @returns Sus datos públicos.
   * @throws {@link LoanRequestNotFoundError} Si no existe, es de otro prestamista o, con
   * `requestedByMembershipId`, de otro cobrador.
   */
  async execute(
    id: string,
    lenderId: string,
    requestedByMembershipId?: string,
  ): Promise<LoanRequestDetails> {
    const request = await this.requests.findById(id, lenderId);
    if (
      request === null ||
      (requestedByMembershipId !== undefined &&
        request.requestedByMembershipId !== requestedByMembershipId)
    ) {
      throw new LoanRequestNotFoundError(id);
    }
    return toLoanRequestDetails(request);
  }
}
