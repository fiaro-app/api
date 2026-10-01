import { Inject, Injectable } from '@nestjs/common';
import { GetLoanUseCase } from '@/modules/loans/application/use-cases/get-loan.use-case.js';
import type { CollectionVisitDetails } from '@/modules/collections/application/dtos/collection-visit-details.dto.js';
import { toCollectionVisitDetails } from '@/modules/collections/application/dtos/collection-visit-details.mapper.js';
import type { CollectionVisitRepository } from '@/modules/collections/domain/repositories/collection-visit.repository.js';
import { COLLECTION_VISIT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-visit-repository.token.js';

/**
 * Lista las visitas de un préstamo del prestamista de la sesión, con sus pagos, de la más
 * antigua a la más nueva. Cualquier rol puede verlo.
 */
@Injectable()
export class ListCollectionVisitsUseCase {
  constructor(
    @Inject(COLLECTION_VISIT_REPOSITORY)
    private readonly visits: CollectionVisitRepository,
    private readonly getLoan: GetLoanUseCase,
  ) {}

  /**
   * @param loanId - El préstamo.
   * @param lenderId - El prestamista dueño, tal como lo resolvió `LenderScopeGuard`.
   * @returns Sus visitas.
   * @throws {@link LoanNotFoundError} Si el préstamo no existe, o es de otro prestamista.
   */
  async execute(
    loanId: string,
    lenderId: string,
  ): Promise<readonly CollectionVisitDetails[]> {
    await this.getLoan.execute(loanId, lenderId);
    const records = await this.visits.listByLoan(loanId);
    return records.map(toCollectionVisitDetails);
  }
}
