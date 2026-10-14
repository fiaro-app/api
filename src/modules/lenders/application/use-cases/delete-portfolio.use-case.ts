import { Inject, Injectable } from '@nestjs/common';
import { CountActiveMembershipsByPortfolioUseCase } from '@/modules/memberships/application/use-cases/count-active-memberships-by-portfolio.use-case.js';
import { PortfolioNotDeletableError } from '@/modules/lenders/domain/errors/portfolio-not-deletable.error.js';
import { PortfolioNotFoundError } from '@/modules/lenders/domain/errors/portfolio-not-found.error.js';
import type { PortfolioRepository } from '@/modules/lenders/domain/repositories/portfolio.repository.js';
import { PORTFOLIO_REPOSITORY } from '@/modules/lenders/domain/tokens/portfolio-repository.token.js';

/**
 * Borra una cartera del prestamista de la sesión. Solo se puede si no es la cartera por defecto
 * y no tiene cobradores activos asignados.
 *
 * @remarks
 * Las membresías inactivas que la tenían quedan sin cartera (`ON DELETE SET NULL`): ya no
 * cobran, así que no hace falta reasignarlas, y bloquear el borrado por ellas dejaría a la
 * persona sin forma de verlas ni de resolverlo desde la pantalla de colaboradores.
 */
@Injectable()
export class DeletePortfolioUseCase {
  constructor(
    @Inject(PORTFOLIO_REPOSITORY)
    private readonly portfolios: PortfolioRepository,
    private readonly countActiveMemberships: CountActiveMembershipsByPortfolioUseCase,
  ) {}

  /**
   * @param portfolioId - La cartera.
   * @param lenderId - El prestamista dueño, tal como lo resolvió `LenderScopeGuard`.
   * @throws {@link PortfolioNotFoundError} Si la cartera no existe, o es de otro prestamista.
   * @throws {@link PortfolioNotDeletableError} Si es la cartera por defecto, o tiene cobradores
   * activos asignados.
   */
  async execute(portfolioId: string, lenderId: string): Promise<void> {
    const portfolio = await this.portfolios.findById(portfolioId, lenderId);
    if (portfolio === null) {
      throw new PortfolioNotFoundError(portfolioId);
    }
    if (portfolio.isDefault) {
      throw new PortfolioNotDeletableError('es la cartera por defecto.');
    }
    const assigned = await this.countActiveMemberships.execute(
      portfolioId,
      lenderId,
    );
    if (assigned > 0) {
      throw new PortfolioNotDeletableError(
        `tiene ${String(assigned)} colaborador(es) activo(s) asignado(s).`,
      );
    }
    await this.portfolios.delete(portfolioId, lenderId);
  }
}
