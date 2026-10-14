import type { PaymentMethod } from '@/modules/collections/domain/entities/payment-method.js';
import type { VisitOutcome } from '@/modules/collections/domain/entities/visit-outcome.js';

/** Criterio de {@link CollectionVisitReportRepository.search}. */
export interface CollectionVisitReportCriteria {
  /** Solo las visitas de préstamos de este prestamista. */
  readonly lenderId: string;
  /** Primera fecha (`AAAA-MM-DD`, hora de Bogotá), inclusive. */
  readonly from: string;
  /** Última fecha (`AAAA-MM-DD`, hora de Bogotá), inclusive. */
  readonly to: string;
  /** Solo las de este cobrador. */
  readonly collectorMembershipId?: string;
  /** Solo las de los cobradores de esta cartera. */
  readonly portfolioId?: string;
  /** Solo las que terminaron así. */
  readonly outcome?: VisitOutcome;
  /** Página, desde 1. */
  readonly page: number;
  /** Tamaño de la página. */
  readonly pageSize: number;
}

/** Una fila del reporte de visitas: la visita con los nombres que la pantalla necesita. */
export interface CollectionVisitReportRow {
  readonly visitId: string;
  readonly occurredAt: Date;
  readonly outcome: VisitOutcome;
  /** Cuota que se esperaba cobrar en ese momento. */
  readonly expectedAmount: number;
  /** Solo con `RESCHEDULED`. */
  readonly promisedDate: string | null;
  readonly loanId: string;
  readonly clientId: string;
  readonly clientFullName: string;
  readonly collectorMembershipId: string;
  readonly collectorFullName: string;
  /** El pago que generó, o `null` si `outcome` no fue `PAID`. */
  readonly payment: {
    readonly id: string;
    readonly amount: number;
    readonly method: PaymentMethod;
    /** Si el pago fue anulado con una reversión (D-85): ya no cuenta como cobrado. */
    readonly reversed: boolean;
  } | null;
}

/** Una página de {@link CollectionVisitReportRepository.search}. */
export interface CollectionVisitReportPage {
  readonly items: readonly CollectionVisitReportRow[];
  /** Cuántas cumplen el criterio en total, sin paginar. */
  readonly total: number;
}

/**
 * Puerto de lectura de las visitas de todo un prestamista (no de un préstamo ni de un cobrador).
 *
 * @remarks
 * Es un modelo de lectura: devuelve filas ya unidas con el nombre del cliente y del cobrador en
 * una sola consulta, en vez de que el caso de uso pida uno por uno a `clients` y `memberships`
 * (una página de 100 visitas serían 200 consultas). No sustituye a {@link CollectionVisitRepository},
 * que sigue siendo el que escribe y el que lee las visitas como entidades.
 */
export interface CollectionVisitReportRepository {
  /**
   * @param criteria - Prestamista, fechas, filtros opcionales y paginación.
   * @returns Las visitas de la página, de la más reciente a la más antigua.
   */
  search(
    criteria: CollectionVisitReportCriteria,
  ): Promise<CollectionVisitReportPage>;
}
