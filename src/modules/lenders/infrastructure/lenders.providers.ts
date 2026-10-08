import type { Provider } from '@nestjs/common';
import { CreateLenderUseCase } from '@/modules/lenders/application/use-cases/create-lender.use-case.js';
import { CreatePortfolioUseCase } from '@/modules/lenders/application/use-cases/create-portfolio.use-case.js';
import { GetLenderLogoUploadUrlUseCase } from '@/modules/lenders/application/use-cases/get-lender-logo-upload-url.use-case.js';
import { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import { ListPortfoliosUseCase } from '@/modules/lenders/application/use-cases/list-portfolios.use-case.js';
import { UpdateLenderUseCase } from '@/modules/lenders/application/use-cases/update-lender.use-case.js';
import { LENDER_REPOSITORY } from '@/modules/lenders/domain/tokens/lender-repository.token.js';
import { PORTFOLIO_REPOSITORY } from '@/modules/lenders/domain/tokens/portfolio-repository.token.js';
import { PrismaLenderRepository } from '@/modules/lenders/infrastructure/persistence/prisma-lender.repository.js';
import { PrismaPortfolioRepository } from '@/modules/lenders/infrastructure/persistence/prisma-portfolio.repository.js';

/** Qué implementa cada puerto del módulo. Vive en `infrastructure` y no en `lenders.module.ts`. */
export const lendersProviders: Provider[] = [
  { provide: LENDER_REPOSITORY, useClass: PrismaLenderRepository },
  { provide: PORTFOLIO_REPOSITORY, useClass: PrismaPortfolioRepository },
  CreateLenderUseCase,
  GetLenderUseCase,
  UpdateLenderUseCase,
  GetLenderLogoUploadUrlUseCase,
  CreatePortfolioUseCase,
  ListPortfoliosUseCase,
];

/**
 * Lo que el módulo ofrece a los demás: el repositorio de prestamistas, su alta y su consulta
 * (`GetLenderUseCase`, que `collections` usa para los días sin cobro del saldo/mora, D-84).
 */
export const lendersExports = [
  LENDER_REPOSITORY,
  CreateLenderUseCase,
  GetLenderUseCase,
];
