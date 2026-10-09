import { Inject, Injectable } from '@nestjs/common';
import type {
  PortfolioDetails,
  UpdatePortfolioInput,
} from '@/modules/lenders/application/dtos/portfolio-details.dto.js';
import { toPortfolioDetails } from '@/modules/lenders/application/dtos/portfolio-details.mapper.js';
import { validatePortfolioData } from '@/modules/lenders/application/services/portfolio-data.validator.js';
import { PortfolioNotFoundError } from '@/modules/lenders/domain/errors/portfolio-not-found.error.js';
import type { PortfolioRepository } from '@/modules/lenders/domain/repositories/portfolio.repository.js';
import { PORTFOLIO_REPOSITORY } from '@/modules/lenders/domain/tokens/portfolio-repository.token.js';

/**
 * Renombra una cartera del prestamista de la sesión. También se puede renombrar la cartera por
 * defecto: lo que no cambia de ella es que no se puede borrar.
 */
@Injectable()
export class UpdatePortfolioUseCase {
  constructor(
    @Inject(PORTFOLIO_REPOSITORY)
    private readonly portfolios: PortfolioRepository,
  ) {}

  /**
   * @param input - El prestamista dueño, la cartera y el nombre nuevo.
   * @returns La cartera con su nombre nuevo.
   * @throws {@link InvalidPortfolioDataError} Si el nombre no cumple el contrato.
   * @throws {@link PortfolioNotFoundError} Si la cartera no existe, o es de otro prestamista.
   * @throws {@link PortfolioNameTakenError} Si otra cartera del mismo prestamista ya usa ese
   * nombre.
   */
  async execute(input: UpdatePortfolioInput): Promise<PortfolioDetails> {
    const data = validatePortfolioData({ name: input.name });
    const portfolio = await this.portfolios.findById(
      input.portfolioId,
      input.lenderId,
    );
    if (portfolio === null) {
      throw new PortfolioNotFoundError(input.portfolioId);
    }
    const renamed = portfolio.rename(data.name);
    await this.portfolios.update(renamed);
    return toPortfolioDetails(renamed);
  }
}
