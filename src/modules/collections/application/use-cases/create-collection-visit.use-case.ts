import { toBusinessDate } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { GetLoanUseCase } from '@/modules/loans/application/use-cases/get-loan.use-case.js';
import { ReconcileLoanStatusUseCase } from '@/modules/loans/application/use-cases/reconcile-loan-status.use-case.js';
import type {
  CollectionVisitDetails,
  CreateCollectionVisitInput,
} from '@/modules/collections/application/dtos/collection-visit-details.dto.js';
import { toCollectionVisitDetails } from '@/modules/collections/application/dtos/collection-visit-details.mapper.js';
import { validateCollectionVisitData } from '@/modules/collections/application/services/collection-visit-data.validator.js';
import { sumNetPayments } from '@/modules/collections/application/services/sum-net-payments.js';
import { CollectionVisit } from '@/modules/collections/domain/entities/collection-visit.entity.js';
import { Payment } from '@/modules/collections/domain/entities/payment.entity.js';
import { CollectorNotAssignedError } from '@/modules/collections/domain/errors/collector-not-assigned.error.js';
import type { CollectionAssignmentRepository } from '@/modules/collections/domain/repositories/collection-assignment.repository.js';
import type { CollectionVisitRepository } from '@/modules/collections/domain/repositories/collection-visit.repository.js';
import { COLLECTION_ASSIGNMENT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-assignment-repository.token.js';
import { COLLECTION_VISIT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-visit-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';

/**
 * Registra una visita de cobro al préstamo de la sesión (PRODUCT.md §5), con su pago si hubo
 * dinero.
 *
 * @remarks
 * Idempotente por diseño (D-29): el `id` de la visita lo genera el dispositivo, así que
 * reenviar la misma visita (misma conexión perdida, mismo reintento) nunca duplica nada —
 * `execute` busca primero por `id` dentro del préstamo y, si ya existe, devuelve ese resultado
 * tal cual, sin comparar ni volver a escribir ni reconciliar el estado otra vez. `expectedAmount`
 * es un snapshot de `loan.installmentValue` en el momento de la visita: no hay ruta para editar
 * un préstamo todavía, así que hoy son siempre iguales, pero la visita no debe cambiar si algún
 * día lo fueran. Visita y pago se guardan en una sola transacción
 * (`CollectionVisitRepository.create`): las dos filas quedan juntas o ninguna queda. Si hubo
 * pago, después de guardarlo recalcula cuánto se ha pagado de verdad (`sumNetPayments`, sin lo
 * reversado) y llama `ReconcileLoanStatusUseCase` (D-85) para cerrar el préstamo a `PAID_OFF` si
 * el saldo ya llegó a cero.
 *
 * @remarks
 * "Modo cobrador" (PRODUCT.md §6, D-89): tener el rol `COLLECTOR` en el prestamista no basta,
 * hace falta además una `CollectionAssignment` vigente para este préstamo el día de la visita
 * (`occurredAt`, no la fecha de hoy: una visita puede llegar tarde por estar offline, D-05, y
 * seguía siendo legítima el día en que de verdad ocurrió). Sin este chequeo, cualquier cobrador
 * del negocio podía registrar visitas sobre préstamos que nunca le asignaron.
 */
@Injectable()
export class CreateCollectionVisitUseCase {
  constructor(
    @Inject(COLLECTION_VISIT_REPOSITORY)
    private readonly visits: CollectionVisitRepository,
    @Inject(COLLECTION_ASSIGNMENT_REPOSITORY)
    private readonly assignments: CollectionAssignmentRepository,
    private readonly getLoan: GetLoanUseCase,
    private readonly reconcileLoanStatus: ReconcileLoanStatusUseCase,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param input - El préstamo, la membresía que cobra, el resultado y, si aplica, el pago.
   * @returns La visita registrada (o la que ya existía, si se reenvió).
   * @throws {@link LoanNotFoundError} Si el préstamo no existe, o es de otro prestamista.
   * @throws {@link CollectorNotAssignedError} Si la membresía no tiene una asignación vigente
   * para este préstamo el día de la visita.
   * @throws {@link InvalidCollectionVisitDataError} Si el resultado y lo que trae el pedido no
   * combinan.
   */
  async execute(
    input: CreateCollectionVisitInput,
  ): Promise<CollectionVisitDetails> {
    const loan = await this.getLoan.execute(input.loanId, input.lenderId);

    const existing = await this.visits.findById(input.id, input.loanId);
    if (existing !== null) {
      return toCollectionVisitDetails(existing);
    }

    const assignedToday = await this.assignments.findActiveByCollectorAndDate(
      input.collectorMembershipId,
      toBusinessDate(input.occurredAt),
    );
    if (
      !assignedToday.some((assignment) => assignment.loanId === input.loanId)
    ) {
      throw new CollectorNotAssignedError();
    }

    validateCollectionVisitData(input);

    const now = this.clock.now();
    const visit = CollectionVisit.create({
      id: input.id,
      loanId: input.loanId,
      collectorMembershipId: input.collectorMembershipId,
      outcome: input.outcome,
      expectedAmount: loan.installmentValue,
      promisedDate: input.promisedDate ?? null,
      occurredAt: input.occurredAt,
      createdAt: now,
    });

    const payment =
      input.outcome === 'PAID' && input.payment
        ? Payment.create({
            id: this.ids.next(),
            loanId: input.loanId,
            visitId: visit.id,
            amount: input.payment.amount,
            method: input.payment.method ?? 'CASH',
            occurredAt: input.occurredAt,
            createdAt: now,
          })
        : null;

    await this.visits.create(visit, payment);

    if (payment !== null) {
      const records = await this.visits.listByLoan(input.loanId);
      await this.reconcileLoanStatus.execute(
        input.loanId,
        input.lenderId,
        sumNetPayments(records),
      );
    }

    return toCollectionVisitDetails({ visit, payment, reversal: null });
  }
}
