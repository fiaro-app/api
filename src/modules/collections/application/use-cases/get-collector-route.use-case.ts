import { toBusinessDate } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { GetClientUseCase } from '@/modules/clients/application/use-cases/get-client.use-case.js';
import type { CollectorRouteEntry } from '@/modules/collections/application/dtos/collector-route-entry.dto.js';
import { GetLoanBalanceUseCase } from '@/modules/collections/application/use-cases/get-loan-balance.use-case.js';
import type { CollectionAssignmentRepository } from '@/modules/collections/domain/repositories/collection-assignment.repository.js';
import type { CollectionVisitRepository } from '@/modules/collections/domain/repositories/collection-visit.repository.js';
import { COLLECTION_ASSIGNMENT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-assignment-repository.token.js';
import { COLLECTION_VISIT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-visit-repository.token.js';
import { groupRecordsByLoan } from '@/modules/collections/application/services/group-records-by-loan.js';
import { sortRouteByPriority } from '@/modules/collections/application/services/sort-route-by-priority.js';
import { sumNetPayments } from '@/modules/collections/application/services/sum-net-payments.js';
import { GetLoanUseCase } from '@/modules/loans/application/use-cases/get-loan.use-case.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/** Qué día de la ruta se pide, y de quién. */
export interface GetCollectorRouteInput {
  /** El cobrador de la sesión. */
  readonly collectorMembershipId: string;
  /** El prestamista con el que opera la sesión. */
  readonly lenderId: string;
  /** Fecha de calendario (`AAAA-MM-DD`); por defecto, hoy. */
  readonly date?: string;
}

/**
 * La ruta del día de un cobrador (PROTOTIPO-FLUJOS.md §4.2): los préstamos `ACTIVE` que debe
 * visitar esa fecha, con su saldo y su mora.
 *
 * @remarks
 * Es la unión de dos fuentes: los préstamos con una `CollectionAssignment` vigente para este
 * cobrador en esa fecha, y los que ese mismo cobrador prometió volver a visitar ese día
 * (`promisedDate`, D-17) — estos últimos reaparecen aunque ya no tengan una asignación vigente
 * con él. No filtra por si la fecha "le toca" según la frecuencia del préstamo (D-10): todo
 * préstamo asignado aparece todos los días, y el saldo/mora de cada fila es lo que le dice al
 * cobrador qué tan urgente es. Compone `GetLoanUseCase` (`loans`), `GetClientUseCase` (`clients`)
 * y `GetLoanBalanceUseCase` (este mismo módulo, D-84) por la capa de aplicación — nunca el
 * dominio de esos módulos (regla de fronteras, ARCHITECTURE.md §3).
 */
@Injectable()
export class GetCollectorRouteUseCase {
  constructor(
    @Inject(COLLECTION_ASSIGNMENT_REPOSITORY)
    private readonly assignments: CollectionAssignmentRepository,
    @Inject(COLLECTION_VISIT_REPOSITORY)
    private readonly visits: CollectionVisitRepository,
    private readonly getLoan: GetLoanUseCase,
    private readonly getClient: GetClientUseCase,
    private readonly getLoanBalance: GetLoanBalanceUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** @param input - El cobrador, el prestamista y la fecha (hoy, si no llega). */
  async execute(
    input: GetCollectorRouteInput,
  ): Promise<readonly CollectorRouteEntry[]> {
    const date = input.date ?? toBusinessDate(this.clock.now());
    const [assigned, promised, todays] = await Promise.all([
      this.assignments.findActiveByCollectorAndDate(
        input.collectorMembershipId,
        date,
      ),
      this.visits.listByCollectorAndPromisedDate(
        input.collectorMembershipId,
        date,
      ),
      this.visits.listByCollectorAndDateRange(
        input.collectorMembershipId,
        date,
        date,
      ),
    ]);
    const collectedByLoan = new Map(
      [...groupRecordsByLoan(todays)].map(([loanId, records]) => [
        loanId,
        sumNetPayments(records),
      ]),
    );
    const loanIds = new Set([
      ...assigned.map((assignment) => assignment.loanId),
      ...promised.map((visit) => visit.loanId),
    ]);

    const entries = await Promise.all(
      [...loanIds].map((loanId) =>
        this.toRouteEntry(
          loanId,
          input.lenderId,
          collectedByLoan.get(loanId) ?? 0,
        ),
      ),
    );
    return sortRouteByPriority(entries.filter((entry) => entry !== null));
  }

  /** @returns La fila de la ruta, o `null` si el préstamo ya no está `ACTIVE`. */
  private async toRouteEntry(
    loanId: string,
    lenderId: string,
    collectedToday: number,
  ): Promise<CollectorRouteEntry | null> {
    const loan = await this.getLoan.execute(loanId, lenderId);
    if (loan.status !== 'ACTIVE') {
      return null;
    }
    const [client, balance] = await Promise.all([
      this.getClient.execute(loan.clientId, lenderId),
      this.getLoanBalance.execute(loanId, lenderId),
    ]);
    return {
      loanId,
      clientId: loan.clientId,
      clientFullName: client.fullName,
      balance: balance.balance,
      overdueAmount: balance.overdueAmount,
      overdueDays: balance.overdueDays,
      nextDueDate: balance.nextDueDate,
      collectedToday,
    };
  }
}
