import { toBusinessDate } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import type {
  CollectorReassignmentInput,
  DeactivateCollectorInput,
  DeactivateCollectorResult,
} from '@/modules/collections/application/dtos/deactivate-collector.dto.js';
import { collectLoanCoverageIssues } from '@/modules/collections/application/services/collector-reassignment-coverage.validator.js';
import { planCollectorReassignment } from '@/modules/collections/application/services/collector-reassignment-planner.js';
import type { CollectionAssignment } from '@/modules/collections/domain/entities/collection-assignment.entity.js';
import { CollectorHasScheduledAssignmentsError } from '@/modules/collections/domain/errors/collector-has-scheduled-assignments.error.js';
import { CollectorNotFoundError } from '@/modules/collections/domain/errors/collector-not-found.error.js';
import { InvalidCollectionAssignmentDataError } from '@/modules/collections/domain/errors/invalid-collection-assignment-data.error.js';
import type { CollectionAssignmentRepository } from '@/modules/collections/domain/repositories/collection-assignment.repository.js';
import { COLLECTION_ASSIGNMENT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-assignment-repository.token.js';
import { GetLoanUseCase } from '@/modules/loans/application/use-cases/get-loan.use-case.js';
import { DeactivateMembershipUseCase } from '@/modules/memberships/application/use-cases/deactivate-membership.use-case.js';
import { GetMembershipUseCase } from '@/modules/memberships/application/use-cases/get-membership.use-case.js';
import { CreateNotificationUseCase } from '@/modules/notifications/application/use-cases/create-notification.use-case.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';
import { DomainError } from '@/shared/domain/errors/domain-error.js';

/** Un cobrador tal como lo devuelve `GetMembershipUseCase`. */
type MembershipDetails = Awaited<ReturnType<GetMembershipUseCase['execute']>>;

/**
 * Da de baja a un cobrador reasignando, en el mismo flujo, cada préstamo activo que tiene asignado
 * hoy (PRODUCT.md §6, PROTOTIPO-FLUJOS.md §4.7, D-18).
 *
 * @remarks
 * El orden protege a los préstamos: primero se reasignan, en una sola transacción de `reassign`, y
 * solo después se marca la membresía `INACTIVE`. Si algo falla a medio camino, ningún préstamo
 * queda sin cobrador, y repetir la petición es seguro: un cobrador que ya no tiene préstamos
 * vigentes solo se da de baja. No revoca las sesiones del cobrador: su membresía inactiva ya le
 * cierra este negocio en cada petición, y revocarlas lo sacaría también de sus otros negocios.
 */
@Injectable()
export class DeactivateCollectorUseCase {
  constructor(
    @Inject(COLLECTION_ASSIGNMENT_REPOSITORY)
    private readonly assignments: CollectionAssignmentRepository,
    private readonly getMembership: GetMembershipUseCase,
    private readonly deactivateMembership: DeactivateMembershipUseCase,
    private readonly getLoan: GetLoanUseCase,
    private readonly createNotification: CreateNotificationUseCase,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param input - El prestamista, el cobrador que se da de baja y a quién pasa cada préstamo.
   * @returns La membresía dada de baja y cuántos préstamos cambiaron de cobrador.
   * @throws {@link CollectorNotFoundError} Si la membresía no es de un cobrador del prestamista.
   * @throws {@link CollectorHasScheduledAssignmentsError} Si tiene asignaciones que empiezan después de hoy.
   * @throws {@link InvalidCollectionAssignmentDataError} Si las reasignaciones no cubren exactamente
   * sus préstamos activos, o algún cobrador destino no sirve.
   */
  async execute(
    input: DeactivateCollectorInput,
  ): Promise<DeactivateCollectorResult> {
    const collector = await this.findCollector(
      input.collectorMembershipId,
      input.lenderId,
    );
    const today = toBusinessDate(this.clock.now());
    const open = await this.assignments.listOpenByCollector(
      collector.id,
      today,
    );
    if (open.some((assignment) => assignment.effectiveFrom > today)) {
      throw new CollectorHasScheduledAssignmentsError();
    }

    const activeLoanIds = await this.activeLoanIds(open, input.lenderId);
    const destinations = await this.validateReassignments(
      input,
      collector.id,
      activeLoanIds,
    );
    const { closed, opened } = planCollectorReassignment(
      open,
      input.reassignments,
      today,
      this.ids,
      this.clock.now(),
    );

    if (closed.length > 0) {
      await this.assignments.reassign(closed, opened);
    }
    await this.deactivateMembership.execute(collector.id, input.lenderId);
    await this.notifyNewCollectors(
      input.lenderId,
      input.reassignments,
      destinations,
    );
    return { membershipId: collector.id, reassignedLoans: opened.length };
  }

  /**
   * @param id - La membresía que se da de baja.
   * @param lenderId - El prestamista dueño.
   * @returns La membresía, si es de un cobrador de ese prestamista.
   */
  private async findCollector(
    id: string,
    lenderId: string,
  ): Promise<MembershipDetails> {
    const membership = await this.getMembership.execute(id, lenderId);
    if (!membership.roles.includes('COLLECTOR')) {
      throw new CollectorNotFoundError(id);
    }
    return membership;
  }

  /**
   * Los préstamos que siguen activos entre los que el cobrador tiene asignados hoy. Los que ya
   * están saldados o cancelados se cierran sin reasignar.
   *
   * @param open - Las asignaciones vigentes del cobrador.
   * @param lenderId - El prestamista dueño.
   */
  private async activeLoanIds(
    open: readonly CollectionAssignment[],
    lenderId: string,
  ): Promise<ReadonlySet<string>> {
    const activeIds = await Promise.all(
      open.map(async (assignment) => {
        const loan = await this.getLoan.execute(assignment.loanId, lenderId);
        return loan.status === 'ACTIVE' ? assignment.loanId : null;
      }),
    );
    return new Set(activeIds.filter((id): id is string => id !== null));
  }

  /**
   * Revisa que las reasignaciones cubran exactamente los préstamos activos del cobrador y que
   * cada cobrador destino esté activo, sea cobrador y no sea el que se da de baja.
   *
   * @param input - Las reasignaciones que pidió quien administra.
   * @param collectorId - El cobrador que se da de baja.
   * @param activeLoanIds - Los préstamos activos que tiene asignados hoy.
   * @returns Los cobradores destino, por id, para avisarles.
   * @throws {@link InvalidCollectionAssignmentDataError} Con un issue por cada problema encontrado.
   */
  private async validateReassignments(
    input: DeactivateCollectorInput,
    collectorId: string,
    activeLoanIds: ReadonlySet<string>,
  ): Promise<ReadonlyMap<string, MembershipDetails>> {
    const issues = collectLoanCoverageIssues(
      input.reassignments,
      activeLoanIds,
    );
    const found = await Promise.all(
      input.reassignments.map((reassignment) =>
        this.findDestination(
          reassignment.collectorMembershipId,
          input.lenderId,
          collectorId,
        ),
      ),
    );
    const destinations = new Map<string, MembershipDetails>();
    found.forEach((destination, index) => {
      if (destination === null) {
        issues.push({
          path: ['reassignments', String(index), 'collectorMembershipId'],
          message:
            'Ese cobrador no puede recibir préstamos: no existe, no está activo, no tiene el rol COLLECTOR o es el mismo que se da de baja.',
          params: {},
        });
      } else {
        destinations.set(destination.id, destination);
      }
    });

    if (issues.length > 0) {
      throw new InvalidCollectionAssignmentDataError(issues);
    }
    return destinations;
  }

  /**
   * @param id - El cobrador destino propuesto.
   * @param lenderId - El prestamista dueño.
   * @param collectorId - El cobrador que se da de baja; no puede ser su propio destino.
   * @returns El cobrador destino si sirve; `null` si no.
   */
  private async findDestination(
    id: string,
    lenderId: string,
    collectorId: string,
  ): Promise<MembershipDetails | null> {
    if (id === collectorId) {
      return null;
    }
    try {
      const membership = await this.getMembership.execute(id, lenderId);
      return membership.status === 'ACTIVE' &&
        membership.roles.includes('COLLECTOR')
        ? membership
        : null;
    } catch (error) {
      // Código genérico NOT_FOUND en vez de `instanceof MembershipNotFoundError`: `application`
      // no puede importar el `domain` de `memberships` (regla de fronteras, ARCHITECTURE.md §3).
      if (error instanceof DomainError && error.code === 'NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Un aviso por cobrador destino, con cuántos préstamos recibió.
   *
   * @param lenderId - El prestamista dueño.
   * @param reassignments - Las reasignaciones validadas.
   * @param destinations - Los cobradores destino, por id.
   */
  private async notifyNewCollectors(
    lenderId: string,
    reassignments: readonly CollectorReassignmentInput[],
    destinations: ReadonlyMap<string, MembershipDetails>,
  ): Promise<void> {
    await Promise.all(
      [...destinations.values()].map((destination) => {
        const count = reassignments.filter(
          (reassignment) =>
            reassignment.collectorMembershipId === destination.id,
        ).length;
        return this.createNotification.execute({
          recipientUserId: destination.userId,
          lenderId,
          severity: 'INFO',
          title: count === 1 ? 'Préstamo asignado' : 'Préstamos asignados',
          body:
            count === 1
              ? 'Te asignaron un préstamo para cobrar.'
              : `Te asignaron ${String(count)} préstamos para cobrar.`,
          relatedEntityType: null,
          relatedEntityId: null,
        });
      }),
    );
  }
}
