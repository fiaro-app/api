import type { CollectionVisit } from '@/modules/collections/domain/entities/collection-visit.entity.js';
import type { Payment } from '@/modules/collections/domain/entities/payment.entity.js';
import type { CollectionVisitRecord } from '@/modules/collections/domain/repositories/collection-visit-record.js';

/** Puerto de persistencia de las visitas de cobro y sus pagos. */
export interface CollectionVisitRepository {
  /**
   * Guarda la visita y, si llega, su pago, en una sola transacción: las dos filas quedan juntas
   * o ninguna queda.
   *
   * @param visit - Visita nueva.
   * @param payment - Su pago, o `null` si `outcome` no fue `PAID`.
   */
  create(visit: CollectionVisit, payment: Payment | null): Promise<void>;

  /**
   * @param id - Identificador de la visita (el que generó el dispositivo).
   * @param loanId - El préstamo dueño: aísla la búsqueda, para que un id de otro préstamo (o de
   * otro prestamista) nunca devuelva nada.
   * @returns La visita con su pago, o `null` si no existe para ese préstamo.
   */
  findById(id: string, loanId: string): Promise<CollectionVisitRecord | null>;

  /**
   * @param loanId - El préstamo.
   * @returns Sus visitas con sus pagos, de la más antigua a la más nueva.
   */
  listByLoan(loanId: string): Promise<readonly CollectionVisitRecord[]>;

  /**
   * Los préstamos que este cobrador prometió volver a visitar en esta fecha (D-17): reaparecen en
   * su ruta del día aunque ya no tengan una asignación vigente con él.
   *
   * @param collectorMembershipId - El cobrador que hizo la promesa.
   * @param promisedDate - Fecha de calendario (`AAAA-MM-DD`).
   */
  listByCollectorAndPromisedDate(
    collectorMembershipId: string,
    promisedDate: string,
  ): Promise<readonly CollectionVisit[]>;

  /**
   * Las visitas de un cobrador en un rango de fechas (por `occurredAt`, D-98), con sus pagos y
   * reversiones, de la más antigua a la más nueva. La fecha es la de calendario del cobrador
   * (hora de Bogotá), no un corte UTC a medianoche.
   *
   * @param collectorMembershipId - El cobrador.
   * @param from - Primera fecha del rango (`AAAA-MM-DD`), inclusive.
   * @param to - Última fecha del rango (`AAAA-MM-DD`), inclusive.
   */
  listByCollectorAndDateRange(
    collectorMembershipId: string,
    from: string,
    to: string,
  ): Promise<readonly CollectionVisitRecord[]>;

  /**
   * Cuántas visitas hizo un cobrador en un rango y cuánto cobró (pagos sin reversión), sumado en la
   * base de datos: lo que piden las estadísticas, sin traer cada visita (D-122). Mismo rango y
   * mismo criterio que `sumNetPayments` sobre {@link listByCollectorAndDateRange}.
   *
   * @param collectorMembershipId - El cobrador.
   * @param from - Primera fecha del rango (`AAAA-MM-DD`), inclusive.
   * @param to - Última fecha del rango (`AAAA-MM-DD`), inclusive.
   */
  summarizeByCollectorAndDateRange(
    collectorMembershipId: string,
    from: string,
    to: string,
  ): Promise<CollectorVisitsSummary>;
}

/** Totales de las visitas de un cobrador en un rango. */
export interface CollectorVisitsSummary {
  readonly visitsCount: number;
  /** Suma de los pagos de esas visitas que no tienen reversión. */
  readonly collectedAmount: number;
}
