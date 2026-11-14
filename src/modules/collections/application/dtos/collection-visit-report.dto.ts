import type { PaymentMethod } from '@/modules/collections/domain/entities/payment-method.js';
import type { VisitOutcome } from '@/modules/collections/domain/entities/visit-outcome.js';

/** Criterio y paginación de {@link SearchCollectionVisitsUseCase}. */
export interface SearchCollectionVisitsInput {
  /** El prestamista dueño, resuelto por `LenderScopeGuard`. */
  readonly lenderId: string;
  /** Primera fecha (`AAAA-MM-DD`); ausente junto con `to` para solo hoy. */
  readonly from?: string;
  /** Última fecha (`AAAA-MM-DD`), inclusive. */
  readonly to?: string;
  readonly collectorMembershipId?: string;
  readonly portfolioId?: string;
  readonly outcome?: VisitOutcome;
  /** Página, desde 1. */
  readonly page: number;
  /** Tamaño de la página. */
  readonly pageSize: number;
}

/** Una fila de «Cobros del día»: la visita con préstamo, cliente, cobrador y pago. */
export interface CollectionVisitReportEntry {
  readonly visitId: string;
  readonly occurredAt: Date;
  readonly outcome: VisitOutcome;
  readonly expectedAmount: number;
  readonly promisedDate: string | null;
  readonly loan: { readonly id: string };
  readonly client: { readonly id: string; readonly fullName: string };
  readonly collector: {
    readonly membershipId: string;
    readonly fullName: string;
  };
  readonly payment: {
    readonly id: string;
    readonly amount: number;
    readonly method: PaymentMethod;
    readonly reversed: boolean;
  } | null;
}

/** Una página de {@link SearchCollectionVisitsUseCase}. */
export interface CollectionVisitReportResult {
  readonly items: readonly CollectionVisitReportEntry[];
  readonly total: number;
  /** El rango que se consultó, resuelto (`from` y `to` ya con su valor por defecto). */
  readonly from: string;
  readonly to: string;
}

/** Criterio y paginación de {@link SummarizeCollectionRoutesUseCase}. */
export interface SummarizeCollectionRoutesInput {
  /** El prestamista dueño, resuelto por `LenderScopeGuard`. */
  readonly lenderId: string;
  /** Primera fecha (`AAAA-MM-DD`); ausente junto con `to` para solo hoy. */
  readonly from?: string;
  /** Última fecha (`AAAA-MM-DD`), inclusive. */
  readonly to?: string;
  readonly collectorMembershipId?: string;
  readonly portfolioId?: string;
  /** Página, desde 1. */
  readonly page: number;
  /** Tamaño de la página. */
  readonly pageSize: number;
}

/** Una fila del registro de rutas: lo que hizo un cobrador en un día. */
export interface CollectionRouteEntry {
  /** El día (`AAAA-MM-DD`, hora de Bogotá). */
  readonly date: string;
  readonly collector: {
    readonly membershipId: string;
    readonly fullName: string;
  };
  readonly startedAt: Date;
  readonly endedAt: Date;
  readonly visitsCount: number;
  readonly paidCount: number;
  readonly expectedAmount: number;
  readonly collectedAmount: number;
}

/** Una página de {@link SummarizeCollectionRoutesUseCase}. */
export interface CollectionRoutesResult {
  readonly items: readonly CollectionRouteEntry[];
  readonly total: number;
  /** El rango que se consultó, resuelto. */
  readonly from: string;
  readonly to: string;
}
