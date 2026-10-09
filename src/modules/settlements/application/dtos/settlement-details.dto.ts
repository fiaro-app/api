import type { SettlementStatus } from '@/modules/settlements/domain/entities/settlement-status.js';

/** Los datos públicos de un cuadre diario, tal como los describe `DailySettlementSchema`. */
export interface SettlementDetails {
  /** Identificador del cuadre (UUIDv7). */
  readonly id: string;
  /** El cobrador dueño de este cuadre. */
  readonly collectorMembershipId: string;
  /** Fecha de calendario del cuadre (`AAAA-MM-DD`). */
  readonly date: string;
  /** Lo esperado, declarado por el cobrador. */
  readonly expectedAmount: number;
  /** Lo cobrado, suma de `collectedCash + collectedNequi + collectedTransfer`. */
  readonly collectedAmount: number;
  /** Lo cobrado en efectivo. */
  readonly collectedCash: number;
  /** Lo cobrado por Nequi. */
  readonly collectedNequi: number;
  /** Lo cobrado por transferencia. */
  readonly collectedTransfer: number;
  /** Estado del cuadre. */
  readonly status: SettlementStatus;
  /** Nota del cobrador; obligatoria cuando `collectedAmount` difiere de `expectedAmount`. */
  readonly collectorNote: string | null;
  /** Comentario del prestamista al revisar, sobre todo al rechazar. */
  readonly reviewNote: string | null;
  /** La membresía que lo revisó, o `null` mientras sigue `PENDING`. */
  readonly reviewedByMembershipId: string | null;
  /** Cuándo se revisó, o `null` mientras sigue `PENDING`. */
  readonly reviewedAt: Date | null;
  /** Último envío del cobrador. */
  readonly submittedAt: Date;
  /** Cuándo se creó la primera vez. */
  readonly createdAt: Date;
}

/**
 * Datos con los que el cobrador cierra su día (D-36). `lenderId` no se usa para validar
 * `collectorMembershipId` (ya lo resolvió `LenderScopeGuard` dentro de la sesión): solo para
 * avisarle a quien administra el prestamista que hay un cuadre por revisar (D-87).
 */
export interface SubmitSettlementInput {
  /** El prestamista con el que opera la sesión, resuelto por `LenderScopeGuard`. */
  readonly lenderId: string;
  /** El cobrador que cierra, resuelto por `LenderScopeGuard`: siempre su propio cuadre. */
  readonly collectorMembershipId: string;
  /** Lo esperado, declarado por el cobrador. */
  readonly expectedAmount: number;
  /** Lo cobrado en efectivo. */
  readonly collectedCash: number;
  /** Lo cobrado por Nequi. */
  readonly collectedNequi: number;
  /** Lo cobrado por transferencia. */
  readonly collectedTransfer: number;
  /** Obligatoria cuando lo cobrado difiere de lo esperado. */
  readonly collectorNote: string | null;
}

/** Datos con los que el prestamista revisa un cuadre. */
export interface ReviewSettlementInput {
  /** El prestamista dueño, resuelto por `LenderScopeGuard`. */
  readonly lenderId: string;
  /** El cuadre que se revisa. */
  readonly settlementId: string;
  /** La membresía que revisa, resuelta por `LenderScopeGuard`. */
  readonly reviewerMembershipId: string;
  /** La decisión. */
  readonly status: 'APPROVED' | 'REJECTED';
  /** Comentario del prestamista, sobre todo al rechazar. */
  readonly reviewNote: string | null;
}

/** Criterio y paginación de {@link ListSettlementsUseCase}. */
export interface ListSettlementsInput {
  /** El prestamista dueño de los cuadres. */
  readonly lenderId: string;
  /** Página, desde 1. */
  readonly page: number;
  /** Tamaño de la página. */
  readonly pageSize: number;
  /** Solo los cuadres de este cobrador; ausente para listar los de todos. */
  readonly collectorMembershipId?: string;
  /** Solo los cuadres en este estado; ausente para listar todos. */
  readonly status?: SettlementStatus;
  /** Solo los cuadres de los cobradores de esta cartera; ausente para listar los de todas. */
  readonly portfolioId?: string;
  /** Primera fecha del cuadre (`AAAA-MM-DD`), inclusive; ausente para no acotar por abajo. */
  readonly from?: string;
  /** Última fecha del cuadre (`AAAA-MM-DD`), inclusive; ausente para no acotar por arriba. */
  readonly to?: string;
}

/** Una página de cuadres. */
export interface SettlementsPageResult {
  /** Los cuadres de esta página. */
  readonly items: readonly SettlementDetails[];
  /** Cuántos cuadres cumplen el criterio en total, sin paginar. */
  readonly total: number;
}
