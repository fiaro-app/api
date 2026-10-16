import { Inject, Injectable } from '@nestjs/common';
import { normalizeNationalId } from '@fiaro-app/contracts';
import { toLoanRequestDetails } from '@/modules/loan-requests/application/dtos/loan-request-details.mapper.js';
import type {
  CreateLoanRequestInput,
  LoanRequestDetails,
} from '@/modules/loan-requests/application/dtos/loan-request-details.dto.js';
import { FindClientIdByNationalIdUseCase } from '@/modules/loan-requests/application/use-cases/find-client-id-by-national-id.use-case.js';
import {
  LoanRequest,
  type LoanRequestNewClient,
} from '@/modules/loan-requests/domain/entities/loan-request.entity.js';
import { LoanRequestClientDataRequiredError } from '@/modules/loan-requests/domain/errors/loan-request-client-data-required.error.js';
import type { LoanRequestRepository } from '@/modules/loan-requests/domain/repositories/loan-request.repository.js';
import { LOAN_REQUEST_REPOSITORY } from '@/modules/loan-requests/domain/tokens/loan-request-repository.token.js';
import { ListActiveMembershipsByRolesUseCase } from '@/modules/memberships/application/use-cases/list-active-memberships-by-roles.use-case.js';
import { CreateNotificationUseCase } from '@/modules/notifications/application/use-cases/create-notification.use-case.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';

/** Roles que reciben el aviso de una solicitud nueva: quienes administran el negocio. */
const ADMIN_ROLES = ['OWNER', 'LENDER'] as const;

/**
 * Un cobrador sugiere un préstamo para el administrador. Si la cédula ya es de un cliente del
 * negocio, la solicitud apunta a él y no guarda datos personales; si no, exige los datos del
 * cliente nuevo. Avisa a cada administrador activo (notificación y push).
 */
@Injectable()
export class CreateLoanRequestUseCase {
  constructor(
    @Inject(LOAN_REQUEST_REPOSITORY)
    private readonly requests: LoanRequestRepository,
    private readonly findClientId: FindClientIdByNationalIdUseCase,
    private readonly listMemberships: ListActiveMembershipsByRolesUseCase,
    private readonly createNotification: CreateNotificationUseCase,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param input - La cédula, los datos del cliente si es nuevo y las condiciones del préstamo.
   * @returns La solicitud creada, `PENDING`.
   * @throws {@link LoanRequestClientDataRequiredError} Si la cédula no es de un cliente del
   * negocio y no vienen los datos del cliente.
   */
  async execute(input: CreateLoanRequestInput): Promise<LoanRequestDetails> {
    const nationalId = normalizeNationalId(input.nationalId);
    const clientId = await this.findClientId.execute(
      input.lenderId,
      nationalId,
    );
    let newClient: LoanRequestNewClient | null = null;
    if (clientId === null) {
      if (input.client === undefined) {
        throw new LoanRequestClientDataRequiredError();
      }
      newClient = input.client;
    }

    const request = LoanRequest.create({
      id: this.ids.next(),
      lenderId: input.lenderId,
      requestedByMembershipId: input.membershipId,
      clientId,
      nationalId,
      newClient,
      terms: {
        principalAmount: input.principalAmount,
        installmentCount: input.installmentCount,
        installmentValue: input.installmentValue,
        totalPayable: input.totalPayable,
        frequency: input.frequency,
        startDate: input.startDate,
      },
      status: 'PENDING',
      resolvedByMembershipId: null,
      resolvedAt: null,
      rejectionReason: null,
      loanId: null,
      createdAt: this.clock.now(),
    });
    await this.requests.create(request);

    await this.notifyAdmins(input.lenderId);
    return toLoanRequestDetails(request);
  }

  /** @param lenderId - El prestamista cuyos administradores reciben el aviso. */
  private async notifyAdmins(lenderId: string): Promise<void> {
    const admins = await this.listMemberships.execute(lenderId, ADMIN_ROLES);
    await Promise.all(
      admins.map((admin) =>
        this.createNotification.execute({
          recipientUserId: admin.userId,
          lenderId,
          severity: 'INFO',
          title: 'Solicitud de préstamo',
          body: 'Un cobrador sugiere un préstamo. Revísalo y acéptalo o recházalo.',
          relatedEntityType: null,
          relatedEntityId: null,
        }),
      ),
    );
  }
}
