import { Inject, Injectable } from '@nestjs/common';
import type {
  LoanRequestDetails,
  RejectLoanRequestInput,
} from '@/modules/loan-requests/application/dtos/loan-request-details.dto.js';
import { toLoanRequestDetails } from '@/modules/loan-requests/application/dtos/loan-request-details.mapper.js';
import type { LoanRequest } from '@/modules/loan-requests/domain/entities/loan-request.entity.js';
import { LoanRequestNotFoundError } from '@/modules/loan-requests/domain/errors/loan-request-not-found.error.js';
import { LoanRequestNotPendingError } from '@/modules/loan-requests/domain/errors/loan-request-not-pending.error.js';
import type { LoanRequestRepository } from '@/modules/loan-requests/domain/repositories/loan-request.repository.js';
import { LOAN_REQUEST_REPOSITORY } from '@/modules/loan-requests/domain/tokens/loan-request-repository.token.js';
import { GetMembershipUseCase } from '@/modules/memberships/application/use-cases/get-membership.use-case.js';
import { CreateNotificationUseCase } from '@/modules/notifications/application/use-cases/create-notification.use-case.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/** El administrador rechaza una solicitud pendiente y le avisa al cobrador que la hizo. */
@Injectable()
export class RejectLoanRequestUseCase {
  constructor(
    @Inject(LOAN_REQUEST_REPOSITORY)
    private readonly requests: LoanRequestRepository,
    private readonly getMembership: GetMembershipUseCase,
    private readonly createNotification: CreateNotificationUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param input - La solicitud, quien la rechaza y el motivo opcional.
   * @returns La solicitud ya `REJECTED`.
   * @throws {@link LoanRequestNotFoundError} Si no existe, o es de otro prestamista.
   * @throws {@link LoanRequestNotPendingError} Si ya fue resuelta.
   */
  async execute(input: RejectLoanRequestInput): Promise<LoanRequestDetails> {
    const request = await this.requireRequest(input.id, input.lenderId);
    const resolvedAt = this.clock.now();
    const reason = input.reason?.trim() ?? null;
    const resolved = await this.requests.resolve({
      id: input.id,
      lenderId: input.lenderId,
      to: 'REJECTED',
      resolvedByMembershipId: input.membershipId,
      resolvedAt,
      rejectionReason: reason,
    });
    if (!resolved) {
      throw new LoanRequestNotPendingError();
    }

    const collector = await this.getMembership.execute(
      request.requestedByMembershipId,
      input.lenderId,
    );
    await this.createNotification.execute({
      recipientUserId: collector.userId,
      lenderId: input.lenderId,
      severity: 'WARNING',
      title: 'Solicitud rechazada',
      body:
        reason === null
          ? 'El administrador rechazó tu solicitud de préstamo.'
          : `El administrador rechazó tu solicitud: ${reason}`,
      relatedEntityType: null,
      relatedEntityId: null,
    });
    return toLoanRequestDetails(
      await this.requireRequest(input.id, input.lenderId),
    );
  }

  /**
   * @param id - La solicitud.
   * @param lenderId - El prestamista dueño.
   * @returns La solicitud tal como quedó guardada.
   * @throws {@link LoanRequestNotFoundError} Si ya no existe.
   */
  private async requireRequest(
    id: string,
    lenderId: string,
  ): Promise<LoanRequest> {
    const request = await this.requests.findById(id, lenderId);
    if (request === null) {
      throw new LoanRequestNotFoundError(id);
    }
    return request;
  }
}
