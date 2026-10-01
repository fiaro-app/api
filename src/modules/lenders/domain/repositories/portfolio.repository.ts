import type { Portfolio } from '@/modules/lenders/domain/entities/portfolio.entity.js';

/** Puerto de persistencia de las carteras. */
export interface PortfolioRepository {
  /**
   * @param portfolio - Cartera nueva.
   * @throws {@link PortfolioNameTakenError} Si ya existe una cartera con ese nombre para el mismo
   * prestamista.
   */
  create(portfolio: Portfolio): Promise<void>;

  /** @param lenderId - El prestamista dueño, de más antigua a más nueva. */
  listByLender(lenderId: string): Promise<readonly Portfolio[]>;
}
