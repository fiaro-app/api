import type { LoanRequest } from '@/modules/loan-requests/domain/entities/loan-request.entity.js';
import type { LoanRequestStatus } from '@/modules/loan-requests/domain/entities/loan-request-status.js';

/** Criterio y paginación de {@link LoanRequestRepository.list}. */
export interface ListLoanRequestsCriteria {
  /** El prestamista dueño. */
  readonly lenderId: string;
  /** Página, desde 1. */
  readonly page: number;
  /** Tamaño de la página. */
  readonly pageSize: number;
  /** Solo las de este estado; ausente para todas. */
  readonly status?: LoanRequestStatus;
  /** Solo las de este cobrador; ausente para las de todos. */
  readonly requestedByMembershipId?: string;
}

/** Una página de solicitudes, de la más nueva a la más antigua. */
export interface LoanRequestsPage {
  /** Las solicitudes de esta página. */
  readonly items: readonly LoanRequest[];
  /** Cuántas cumplen el criterio en total, sin paginar. */
  readonly total: number;
}

/** Datos de la resolución de una solicitud pendiente. */
export interface ResolveLoanRequestInput {
  /** La solicitud. */
  readonly id: string;
  /** El prestamista dueño. */
  readonly lenderId: string;
  /** Estado al que pasa. */
  readonly to: 'APPROVED' | 'REJECTED';
  /** La membresía que la resuelve. */
  readonly resolvedByMembershipId: string;
  /** Cuándo la resuelve. */
  readonly resolvedAt: Date;
  /** Motivo del rechazo, si lo escribió. */
  readonly rejectionReason: string | null;
}

/** Puerto de persistencia de las solicitudes de préstamo. */
export interface LoanRequestRepository {
  /** @param request - Solicitud nueva. */
  create(request: LoanRequest): Promise<void>;

  /**
   * @param id - La solicitud.
   * @param lenderId - El prestamista dueño.
   * @returns La solicitud, o `null` si no existe o es de otro prestamista.
   */
  findById(id: string, lenderId: string): Promise<LoanRequest | null>;

  /** @param criteria - Filtros y paginación. */
  list(criteria: ListLoanRequestsCriteria): Promise<LoanRequestsPage>;

  /**
   * Pasa la solicitud de `PENDING` a su estado final de forma atómica: si dos administradores la
   * resuelven a la vez, solo uno lo logra.
   *
   * @param input - Datos de la resolución.
   * @returns `true` si estaba pendiente y ahora quedó resuelta; `false` si ya no lo estaba.
   */
  resolve(input: ResolveLoanRequestInput): Promise<boolean>;

  /**
   * Guarda el préstamo creado al aceptar la solicitud.
   *
   * @param id - La solicitud.
   * @param loanId - El préstamo creado.
   */
  attachLoan(id: string, loanId: string): Promise<void>;

  /**
   * Devuelve a `PENDING` una solicitud cuya aceptación falló, para que se pueda reintentar.
   *
   * @param id - La solicitud.
   */
  reopen(id: string): Promise<void>;
}
