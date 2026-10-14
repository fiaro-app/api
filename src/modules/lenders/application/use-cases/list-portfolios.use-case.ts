import { Inject, Injectable } from '@nestjs/common';
import type { PortfolioDetails } from '@/modules/lenders/application/dtos/portfolio-details.dto.js';
import { toPortfolioDetails } from '@/modules/lenders/application/dtos/portfolio-details.mapper.js';
import type { PortfolioRepository } from '@/modules/lenders/domain/repositories/portfolio.repository.js';
import { PORTFOLIO_REPOSITORY } from '@/modules/lenders/domain/tokens/portfolio-repository.token.js';

/**
 * Lista las carteras del prestamista de la sesión. Cualquier rol puede verlas. Sin paginar: son
 * pocas por prestamista (una zona no es un recurso que crezca sin límite, a diferencia de
 * `Client` o `Loan`).
 */
@Injectable()
export class ListPortfoliosUseCase {
  constructor(
    @Inject(PORTFOLIO_REPOSITORY)
    private readonly portfolios: PortfolioRepository,
  ) {}

  /** @param lenderId - El prestamista dueño de las carteras. */
  async execute(lenderId: string): Promise<readonly PortfolioDetails[]> {
    const portfolios = await this.portfolios.listByLender(lenderId);
    return portfolios.map(toPortfolioDetails);
  }
}
