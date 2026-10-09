import { Inject, Injectable } from '@nestjs/common';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';
import { toLoanDetails } from '@/modules/loans/application/dtos/loan-details.mapper.js';
import type { LoanRepository } from '@/modules/loans/domain/repositories/loan.repository.js';
import { LOAN_REPOSITORY } from '@/modules/loans/domain/tokens/loan-repository.token.js';

/**
 * Los préstamos `ACTIVE` de un conjunto de clientes del prestamista de la sesión, en una sola
 * consulta. Lo usa `collections` para sumar el saldo y la mora de cada cliente de la lista de
 * clientes (D-113), por la capa de aplicación y no por el dominio (regla de fronteras, §3).
 */
@Injectable()
export class ListActiveLoansByClientsUseCase {
  constructor(
    @Inject(LOAN_REPOSITORY) private readonly loans: LoanRepository,
  ) {}

  /**
   * @param lenderId - El prestamista dueño, tal como lo resolvió `LenderScopeGuard`.
   * @param clientIds - Los clientes; vacío no consulta nada.
   * @returns Sus préstamos `ACTIVE`.
   */
  async execute(
    lenderId: string,
    clientIds: readonly string[],
  ): Promise<readonly LoanDetails[]> {
    if (clientIds.length === 0) {
      return [];
    }
    const loans = await this.loans.listActiveByClients(lenderId, clientIds);
    return loans.map(toLoanDetails);
  }
}
