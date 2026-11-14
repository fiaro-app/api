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
  /** Solo estos préstamos (por ejemplo, los que un cobrador tiene asignados hoy); ausente para no acotar. */
  readonly ids?: readonly string[];
  /**
   * Solo los que estaban abiertos justo antes de este instante: creados antes y sin cerrar o
   * cerrados desde entonces. Lo usan las estadísticas del período anterior (D-122).
   */
  readonly openAt?: Date;
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

  /**
   * Los préstamos `ACTIVE` de un conjunto de clientes, en una sola consulta. Es la base de la
   * cartera por cliente de la lista de clientes (D-113), que no puede pedir los préstamos de
   * cada uno por separado.
   *
   * @param lenderId - El prestamista dueño.
   * @param clientIds - Los clientes.
   * @returns Sus préstamos `ACTIVE`, de los más antiguos a los más nuevos.
   */
  listActiveByClients(
    lenderId: string,
    clientIds: readonly string[],
  ): Promise<readonly Loan[]>;

  /**
   * Cuántos préstamos `ACTIVE` tiene el prestamista: lo que cuenta contra el tope del plan.
   *
   * @param lenderId - El prestamista dueño.
   */
  countActive(lenderId: string): Promise<number>;

  /**
   * Los prestamistas que tienen préstamos en ese estado, sin repetir. Es la única consulta que
   * cruza prestamistas: la usa el aviso diario de mora (D-96), que recorre a todos, y por eso no
   * pide un `lenderId` como el resto.
   *
   * @param status - El estado de los préstamos.
   * @returns Los identificadores de esos prestamistas.
   */
  listLenderIdsWithStatus(status: LoanStatus): Promise<readonly string[]>;

  /**
   * Reemplaza los datos del préstamo. Se guarda con su propio `lenderId`, así que no puede mover
   * un préstamo de un prestamista a otro.
   *
   * @param loan - Préstamo con sus datos ya actualizados.
   */
  update(loan: Loan): Promise<void>;
}
