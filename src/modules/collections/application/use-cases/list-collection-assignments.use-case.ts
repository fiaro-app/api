import { Inject, Injectable } from '@nestjs/common';
import { GetLoanUseCase } from '@/modules/loans/application/use-cases/get-loan.use-case.js';
import type { CollectionAssignmentDetails } from '@/modules/collections/application/dtos/collection-assignment-details.dto.js';
import { toCollectionAssignmentDetails } from '@/modules/collections/application/dtos/collection-assignment-details.mapper.js';
import type { CollectionAssignmentRepository } from '@/modules/collections/domain/repositories/collection-assignment.repository.js';
import { COLLECTION_ASSIGNMENT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-assignment-repository.token.js';

/**
 * Lista el historial de asignaciones de un préstamo del prestamista de la sesión, de la más
 * antigua a la más nueva. Cualquier rol puede verlo.
 */
@Injectable()
export class ListCollectionAssignmentsUseCase {
  constructor(
    @Inject(COLLECTION_ASSIGNMENT_REPOSITORY)
    private readonly assignments: CollectionAssignmentRepository,
    private readonly getLoan: GetLoanUseCase,
  ) {}

  /**
   * @param loanId - El préstamo.
   * @param lenderId - El prestamista dueño, tal como lo resolvió `LenderScopeGuard`.
   * @returns Sus asignaciones.
   * @throws {@link LoanNotFoundError} Si el préstamo no existe, o es de otro prestamista.
   */
  async execute(
    loanId: string,
    lenderId: string,
  ): Promise<readonly CollectionAssignmentDetails[]> {
    await this.getLoan.execute(loanId, lenderId);
    const list = await this.assignments.listByLoan(loanId);
    return list.map(toCollectionAssignmentDetails);
  }
}
