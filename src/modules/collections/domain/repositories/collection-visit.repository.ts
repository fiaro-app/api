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
}
