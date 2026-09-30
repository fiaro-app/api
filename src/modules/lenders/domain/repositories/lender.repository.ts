import type { Lender } from '@/modules/lenders/domain/entities/lender.entity.js';

/** Puerto de persistencia de los prestamistas. */
export interface LenderRepository {
  /**
   * Guarda al prestamista y su cartera "General" por defecto en una sola operación: nunca queda
   * un Lender sin al menos una cartera (PRODUCT.md §5).
   *
   * @param lender - Prestamista nuevo.
   */
  create(lender: Lender): Promise<void>;

  /**
   * @param id - Identificador del prestamista.
   * @returns El prestamista, o `null` si no existe.
   */
  findById(id: string): Promise<Lender | null>;
}
