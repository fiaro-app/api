import type { Loan } from '@/modules/loans/domain/entities/loan.entity.js';
import type { LoanStatus } from '@/modules/loans/domain/entities/loan-status.js';

/** Criterio de {@link LoanRepository.list}. */
export interface ListLoansCriteria {
  /** El prestamista dueño de los préstamos. */
  readonly lenderId: string;
  /** Página, desde 1. */
  readonly page: number;
  /** Tamaño de la página. */
  readonly pageSize: number;
  /** Solo los préstamos de este cliente; ausente para listar los de todos. */
  readonly clientId?: string;
  /** Solo los préstamos en este estado; ausente para listar todos. */
  readonly status?: LoanStatus;
}

/** Una página de {@link LoanRepository.list}. */
export interface LoansPage {
  /** Los préstamos de esta página. */
  readonly items: readonly Loan[];
  /** Cuántos préstamos cumplen el criterio en total, sin paginar. */
  readonly total: number;
}

/** Puerto de persistencia de los préstamos. */
export interface LoanRepository {
  /** @param loan - Préstamo nuevo. */
  create(loan: Loan): Promise<void>;

  /**
   * Busca por id dentro de un prestamista: un id de otro prestamista es indistinguible de uno
   * que no existe (aislamiento por `lenderId`, PRODUCT.md §6).
   *
   * @param id - Identificador del préstamo.
   * @param lenderId - El prestamista dueño.
   * @returns El préstamo, o `null` si no existe para ese prestamista.
   */
  findById(id: string, lenderId: string): Promise<Loan | null>;

  /** @param criteria - Prestamista, paginación y filtros opcionales. */
  list(criteria: ListLoansCriteria): Promise<LoansPage>;
}
