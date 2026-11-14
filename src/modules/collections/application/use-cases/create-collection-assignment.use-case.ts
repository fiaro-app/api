import { Inject, Injectable } from '@nestjs/common';
import { GetLoanUseCase } from '@/modules/loans/application/use-cases/get-loan.use-case.js';
import { GetMembershipUseCase } from '@/modules/memberships/application/use-cases/get-membership.use-case.js';
import type {
  CollectionAssignmentDetails,
  CreateCollectionAssignmentInput,
} from '@/modules/collections/application/dtos/collection-assignment-details.dto.js';
import { toCollectionAssignmentDetails } from '@/modules/collections/application/dtos/collection-assignment-details.mapper.js';
import { CollectionAssignment } from '@/modules/collections/domain/entities/collection-assignment.entity.js';
import { InvalidCollectionAssignmentDataError } from '@/modules/collections/domain/errors/invalid-collection-assignment-data.error.js';
import type { CollectionAssignmentRepository } from '@/modules/collections/domain/repositories/collection-assignment.repository.js';
import { COLLECTION_ASSIGNMENT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-assignment-repository.token.js';
import { CreateNotificationUseCase } from '@/modules/notifications/application/use-cases/create-notification.use-case.js';
import { addDays } from '@/shared/domain/calendar/business-date.js';
import type { DomainIssue } from '@/shared/domain/errors/domain-error.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';

/**
 * Asigna un cobrador a un préstamo del prestamista de la sesión (PRODUCT.md §5).
 *
 * @remarks
 * Si `effectiveTo` no llega (permanente), cierra la asignación vigente del préstamo
 * (`effectiveTo` al día anterior a la nueva `effectiveFrom`), si tiene una, antes de crear la
 * nueva — así queda el historial de quién cobraba cada día. Si `effectiveTo` llega (un reemplazo
 * de uno o varios días), no toca la asignación permanente: ambas conviven. Compone
 * `GetLoanUseCase` (`loans/application`), `GetMembershipUseCase` (`memberships/application`) y
 * `CreateNotificationUseCase` (`notifications/application`, D-87: avisa al cobrador con el
 * préstamo ya asignado) por la capa de aplicación (regla de fronteras, ARCHITECTURE.md §3).
 */
@Injectable()
export class CreateCollectionAssignmentUseCase {
  constructor(
    @Inject(COLLECTION_ASSIGNMENT_REPOSITORY)
    private readonly assignments: CollectionAssignmentRepository,
    private readonly getLoan: GetLoanUseCase,
    private readonly getMembership: GetMembershipUseCase,
    private readonly createNotification: CreateNotificationUseCase,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param input - El préstamo, el cobrador y las fechas de vigencia.
   * @returns La asignación creada.
   * @throws {@link LoanNotFoundError} Si el préstamo no existe, o es de otro prestamista.
   * @throws {@link MembershipNotFoundError} Si la membresía no existe, o es de otro prestamista.
   * @throws {@link InvalidCollectionAssignmentDataError} Si la membresía no tiene el rol
   * `COLLECTOR`, o `effectiveTo` es anterior a `effectiveFrom`.
   */
  async execute(
    input: CreateCollectionAssignmentInput,
  ): Promise<CollectionAssignmentDetails> {
    await this.getLoan.execute(input.loanId, input.lenderId);
    const collector = await this.getMembership.execute(
      input.collectorMembershipId,
      input.lenderId,
    );

    const effectiveTo = input.effectiveTo ?? null;
    assertValid(collector.roles, input.effectiveFrom, effectiveTo);

    if (effectiveTo === null) {
      await this.closeOpenAssignment(input.loanId, input.effectiveFrom);
    }

    const assignment = CollectionAssignment.create({
      id: this.ids.next(),
      loanId: input.loanId,
      collectorMembershipId: input.collectorMembershipId,
      effectiveFrom: input.effectiveFrom,
      effectiveTo,
      createdAt: this.clock.now(),
    });
    await this.assignments.create(assignment);
    if (input.notify !== false) {
      await this.createNotification.execute({
        recipientUserId: collector.userId,
        lenderId: input.lenderId,
        severity: 'INFO',
        title: 'Préstamo asignado',
        body: 'Te asignaron un préstamo para cobrar.',
        relatedEntityType: 'LOAN',
        relatedEntityId: input.loanId,
      });
    }
    return toCollectionAssignmentDetails(assignment);
  }

  /**
   * @param loanId - El préstamo.
   * @param newEffectiveFrom - Desde cuándo rige la nueva asignación permanente.
   */
  private async closeOpenAssignment(
    loanId: string,
    newEffectiveFrom: string,
  ): Promise<void> {
    const open = await this.assignments.findOpenByLoan(loanId);
    if (open === null) {
      return;
    }
    const closed = CollectionAssignment.create({
      id: open.id,
      loanId: open.loanId,
      collectorMembershipId: open.collectorMembershipId,
      effectiveFrom: open.effectiveFrom,
      effectiveTo: addDays(newEffectiveFrom, -1),
      createdAt: open.createdAt,
    });
    await this.assignments.update(closed);
  }
}

/**
 * @param roles - Roles de la membresía elegida.
 * @param effectiveFrom - Inicio de la vigencia.
 * @param effectiveTo - Fin de la vigencia, o `null` si es permanente.
 * @throws {@link InvalidCollectionAssignmentDataError} Si no es cobrador o el rango es inválido.
 */
function assertValid(
  roles: readonly string[],
  effectiveFrom: string,
  effectiveTo: string | null,
): void {
  const issues: DomainIssue[] = [];
  if (!roles.includes('COLLECTOR')) {
    issues.push({
      path: ['collectorMembershipId'],
      message: 'La membresía no tiene el rol COLLECTOR.',
      params: {},
    });
  }
  if (effectiveTo !== null && effectiveTo < effectiveFrom) {
    issues.push({
      path: ['effectiveTo'],
      message: 'No puede ser anterior a effectiveFrom.',
      params: {},
    });
  }
  if (issues.length > 0) {
    throw new InvalidCollectionAssignmentDataError(issues);
  }
}
