import type { Payment } from '@/modules/collections/domain/entities/payment.entity.js';

/** Puerto de lectura de los pagos. Se crean junto a su visita (`CollectionVisitRepository`). */
export interface PaymentRepository {
  /**
   * Busca por id dentro de un prestamista, a través del préstamo que pagó: un id de otro
   * prestamista es indistinguible de uno que no existe (aislamiento por `lenderId`, PRODUCT.md
   * §6), mismo criterio que `LoanRepository.findById`.
   *
   * @param id - Identificador del pago.
   * @param lenderId - El prestamista dueño del préstamo que pagó.
   * @returns El pago, o `null` si no existe para ese prestamista.
   */
  findById(id: string, lenderId: string): Promise<Payment | null>;
}
