import { Inject, Injectable } from '@nestjs/common';
import { CreateClientUseCase } from '@/modules/clients/application/use-cases/create-client.use-case.js';
import { CreateCollectionAssignmentUseCase } from '@/modules/collections/application/use-cases/create-collection-assignment.use-case.js';
import { CreateLoanUseCase } from '@/modules/loans/application/use-cases/create-loan.use-case.js';
import type {
  ApproveLoanRequestInput,
  LoanRequestDetails,
} from '@/modules/loan-requests/application/dtos/loan-request-details.dto.js';
import { toLoanRequestDetails } from '@/modules/loan-requests/application/dtos/loan-request-details.mapper.js';
import type { LoanRequest } from '@/modules/loan-requests/domain/entities/loan-request.entity.js';
import { LoanRequestClientDataRequiredError } from '@/modules/loan-requests/domain/errors/loan-request-client-data-required.error.js';
import { LoanRequestNotFoundError } from '@/modules/loan-requests/domain/errors/loan-request-not-found.error.js';
import { LoanRequestNotPendingError } from '@/modules/loan-requests/domain/errors/loan-request-not-pending.error.js';
import type { LoanRequestRepository } from '@/modules/loan-requests/domain/repositories/loan-request.repository.js';
import { LOAN_REQUEST_REPOSITORY } from '@/modules/loan-requests/domain/tokens/loan-request-repository.token.js';
import { GetMembershipUseCase } from '@/modules/memberships/application/use-cases/get-membership.use-case.js';
import { CreateNotificationUseCase } from '@/modules/notifications/application/use-cases/create-notification.use-case.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/**
 * El administrador acepta una solicitud: crea el cliente (si era nuevo), el préstamo y su
 * asignación al cobrador que la hizo, con los ajustes que el administrador quiera, y le avisa al
 * cobrador. La solicitud se reserva primero (`resolve`) para que dos administradores no creen dos
 * préstamos; si algo falla después, vuelve a `PENDING`.
 */
@Injectable()
export class ApproveLoanRequestUseCase {
  constructor(
    @Inject(LOAN_REQUEST_REPOSITORY)
    private readonly requests: LoanRequestRepository,
    private readonly createClient: CreateClientUseCase,
    private readonly createLoan: CreateLoanUseCase,
    private readonly createAssignment: CreateCollectionAssignmentUseCase,
    private readonly getMembership: GetMembershipUseCase,
    private readonly createNotification: CreateNotificationUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param input - La solicitud, quien la acepta y los ajustes opcionales.
   * @returns La solicitud ya `APPROVED`, con el préstamo creado.
   * @throws {@link LoanRequestNotFoundError} Si no existe, o es de otro prestamista.
   * @throws {@link LoanRequestNotPendingError} Si ya fue resuelta.
   * @throws {@link InvalidClientDataError} Si los datos del cliente ajustados no son válidos.
   * @throws {@link ClientNationalIdTakenError} Si el cliente nuevo ya existe con esa cédula.
   * @throws {@link InvalidLoanDataError} Si las condiciones ajustadas no son válidas.
   */
  async execute(input: ApproveLoanRequestInput): Promise<LoanRequestDetails> {
    const request = await this.requireRequest(input.id, input.lenderId);
    const reserved = await this.requests.resolve({
      id: input.id,
      lenderId: input.lenderId,
      to: 'APPROVED',
      resolvedByMembershipId: input.membershipId,
      resolvedAt: this.clock.now(),
      rejectionReason: null,
    });
    if (!reserved) {
      throw new LoanRequestNotPendingError();
    }

    let loanId: string;
    try {
      loanId = await this.createEverything(request, input);
    } catch (error) {
      await this.requests.reopen(input.id);
      throw error;
    }
    await this.requests.attachLoan(input.id, loanId);

    const collector = await this.getMembership.execute(
      request.requestedByMembershipId,
      input.lenderId,
    );
    await this.createNotification.execute({
      recipientUserId: collector.userId,
      lenderId: input.lenderId,
      severity: 'SUCCESS',
      title: 'Solicitud aceptada',
      body: 'El administrador aceptó tu solicitud: el préstamo ya es tuyo para cobrar.',
      relatedEntityType: 'LOAN',
      relatedEntityId: loanId,
    });
    return toLoanRequestDetails(
      await this.requireRequest(input.id, input.lenderId),
    );
  }

  /**
   * @param request - La solicitud reservada.
   * @param input - Los ajustes del administrador.
   * @returns El `id` del préstamo creado y asignado al cobrador.
   */
  private async createEverything(
    request: LoanRequest,
    input: ApproveLoanRequestInput,
  ): Promise<string> {
    const terms = { ...request.terms, ...input.loan };
    const clientId = await this.resolveClientId(request, input);
    const loan = await this.createLoan.execute({
      lenderId: input.lenderId,
      membershipId: input.membershipId,
      clientId,
      ...terms,
    });
    await this.createAssignment.execute({
      lenderId: input.lenderId,
      loanId: loan.id,
      collectorMembershipId: request.requestedByMembershipId,
      effectiveFrom: terms.startDate,
    });
    return loan.id;
  }

  /**
   * @param id - La solicitud.
   * @param lenderId - El prestamista dueño.
   * @returns La solicitud tal como quedó guardada.
   * @throws {@link LoanRequestNotFoundError} Si no existe, o es de otro prestamista.
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

  /**
   * @param request - La solicitud reservada.
   * @param input - Los ajustes del administrador.
   * @returns El cliente de la solicitud: el existente, o el recién creado.
   */
  private async resolveClientId(
    request: LoanRequest,
    input: ApproveLoanRequestInput,
  ): Promise<string> {
    if (request.clientId !== null) {
      return request.clientId;
    }
    if (request.newClient === null) {
      throw new LoanRequestClientDataRequiredError();
    }
    const created = await this.createClient.execute({
      lenderId: input.lenderId,
      nationalId: request.nationalId,
      ...request.newClient,
      ...input.client,
    });
    return created.id;
  }
}
