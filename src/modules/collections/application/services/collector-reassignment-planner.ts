import type { CollectorReassignmentInput } from '@/modules/collections/application/dtos/deactivate-collector.dto.js';
import { CollectionAssignment } from '@/modules/collections/domain/entities/collection-assignment.entity.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { addDays } from '@/shared/domain/calendar/business-date.js';

/** Las asignaciones que cierran y las que abren al dar de baja a un cobrador. */
export interface CollectorReassignmentPlan {
  readonly closed: readonly CollectionAssignment[];
  readonly opened: readonly CollectionAssignment[];
}

/**
 * Cada asignación vigente del cobrador se cierra; solo las de préstamos con un cobrador nuevo
 * asignado abren, además, una asignación nueva desde hoy.
 *
 * @remarks
 * Cierra en `hoy - 1`, la misma convención de la reasignación normal (D-82), para que el cobrador
 * nuevo empiece hoy sin solaparse con el anterior — salvo que la asignación haya empezado hoy
 * mismo, porque no puede terminar antes de empezar.
 *
 * @param open - Las asignaciones vigentes del cobrador.
 * @param reassignments - Las reasignaciones ya validadas.
 * @param today - La fecha de hoy (`AAAA-MM-DD`), en hora de Colombia.
 * @param ids - Generador de ids para las asignaciones nuevas.
 * @param now - Instante para el `createdAt` de las asignaciones nuevas.
 */
export function planCollectorReassignment(
  open: readonly CollectionAssignment[],
  reassignments: readonly CollectorReassignmentInput[],
  today: string,
  ids: IdGenerator,
  now: Date,
): CollectorReassignmentPlan {
  const newCollectorByLoan = new Map(
    reassignments.map((reassignment) => [
      reassignment.loanId,
      reassignment.collectorMembershipId,
    ]),
  );
  const closed: CollectionAssignment[] = [];
  const opened: CollectionAssignment[] = [];
  for (const assignment of open) {
    closed.push(
      CollectionAssignment.create({
        id: assignment.id,
        loanId: assignment.loanId,
        collectorMembershipId: assignment.collectorMembershipId,
        effectiveFrom: assignment.effectiveFrom,
        effectiveTo: closingDate(assignment.effectiveFrom, today),
        createdAt: assignment.createdAt,
      }),
    );
    const newCollector = newCollectorByLoan.get(assignment.loanId);
    if (newCollector !== undefined) {
      opened.push(
        CollectionAssignment.create({
          id: ids.next(),
          loanId: assignment.loanId,
          collectorMembershipId: newCollector,
          effectiveFrom: today,
          effectiveTo: null,
          createdAt: now,
        }),
      );
    }
  }
  return { closed, opened };
}

/**
 * La fecha en que cierra una asignación que se da de baja: `hoy - 1`, salvo que haya empezado hoy.
 *
 * @param effectiveFrom - Cuándo empezó la asignación (`AAAA-MM-DD`).
 * @param today - La fecha de hoy (`AAAA-MM-DD`).
 */
function closingDate(effectiveFrom: string, today: string): string {
  return effectiveFrom < today ? addDays(today, -1) : today;
}
