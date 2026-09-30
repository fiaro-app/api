import type { Provider } from '@nestjs/common';
import { CreateLenderUseCase } from '@/modules/lenders/application/use-cases/create-lender.use-case.js';
import { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import { UpdateLenderUseCase } from '@/modules/lenders/application/use-cases/update-lender.use-case.js';
import { LENDER_REPOSITORY } from '@/modules/lenders/domain/tokens/lender-repository.token.js';
import { PrismaLenderRepository } from '@/modules/lenders/infrastructure/persistence/prisma-lender.repository.js';

/** Qué implementa cada puerto del módulo. Vive en `infrastructure` y no en `lenders.module.ts`. */
export const lendersProviders: Provider[] = [
  { provide: LENDER_REPOSITORY, useClass: PrismaLenderRepository },
  CreateLenderUseCase,
  GetLenderUseCase,
  UpdateLenderUseCase,
];

/** Lo que el módulo ofrece a los demás: el repositorio de prestamistas y su alta. */
export const lendersExports = [LENDER_REPOSITORY, CreateLenderUseCase];
