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

  /**
   * @param id - Identificador de la cartera.
   * @param lenderId - El prestamista dueño.
   * @returns La cartera, o `null` si no existe o es de otro prestamista.
   */
  findById(id: string, lenderId: string): Promise<Portfolio | null>;

  /**
   * @param portfolio - La cartera con su nombre ya cambiado.
   * @throws {@link PortfolioNameTakenError} Si el nombre ya lo usa otra cartera del mismo
   * prestamista.
   */
  update(portfolio: Portfolio): Promise<void>;

  /**
   * @param id - Identificador de la cartera.
   * @param lenderId - El prestamista dueño.
   */
  delete(id: string, lenderId: string): Promise<void>;
}
