import { Inject, Injectable } from '@nestjs/common';
import type {
  CreatePortfolioInput,
  PortfolioDetails,
} from '@/modules/lenders/application/dtos/portfolio-details.dto.js';
import { toPortfolioDetails } from '@/modules/lenders/application/dtos/portfolio-details.mapper.js';
import type { PortfolioLimit } from '@/modules/lenders/application/ports/portfolio-limit.port.js';
import { PORTFOLIO_LIMIT } from '@/modules/lenders/application/ports/portfolio-limit.token.js';
import { validatePortfolioData } from '@/modules/lenders/application/services/portfolio-data.validator.js';
import { PortfolioLimitReachedError } from '@/modules/lenders/domain/errors/portfolio-limit-reached.error.js';
import { Portfolio } from '@/modules/lenders/domain/entities/portfolio.entity.js';
import type { PortfolioRepository } from '@/modules/lenders/domain/repositories/portfolio.repository.js';
import { PORTFOLIO_REPOSITORY } from '@/modules/lenders/domain/tokens/portfolio-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';

/**
 * Da de alta una cartera adicional para el prestamista de la sesión. La cartera "General" no
 * nace aquí: la crea `LenderRepository.create` (D-72), junto con el Lender.
 */
@Injectable()
export class CreatePortfolioUseCase {
  constructor(
    @Inject(PORTFOLIO_REPOSITORY)
    private readonly portfolios: PortfolioRepository,
    @Inject(PORTFOLIO_LIMIT) private readonly limit: PortfolioLimit,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param input - El prestamista dueño y el nombre de la cartera.
   * @returns La cartera creada.
   * @throws {@link InvalidPortfolioDataError} Si el nombre no cumple el contrato.
   * @throws {@link PortfolioLimitReachedError} Si el prestamista ya tiene el máximo de carteras de su plan.
   * @throws {@link PortfolioNameTakenError} Si ya existe una cartera con ese nombre para el mismo
   * prestamista.
   */
  async execute(input: CreatePortfolioInput): Promise<PortfolioDetails> {
    const data = validatePortfolioData(input);
    const existing = await this.portfolios.listByLender(input.lenderId);
    const max = await this.limit.maxPortfolios(input.lenderId);
    if (max !== null && existing.length >= max) {
      throw new PortfolioLimitReachedError(max);
    }
    const portfolio = Portfolio.create({
      id: this.ids.next(),
      lenderId: input.lenderId,
      name: data.name,
      isDefault: false,
      createdAt: this.clock.now(),
    });
    await this.portfolios.create(portfolio);
    return toPortfolioDetails(portfolio);
  }
}
