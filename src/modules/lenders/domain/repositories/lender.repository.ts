import type { Lender } from '@/modules/lenders/domain/entities/lender.entity.js';

/** Puerto de persistencia de los prestamistas. */
export interface LenderRepository {
  /** @param lender - Prestamista nuevo. */
  create(lender: Lender): Promise<void>;

  /**
   * @param id - Identificador del prestamista.
   * @returns El prestamista, o `null` si no existe.
   */
  findById(id: string): Promise<Lender | null>;
}
