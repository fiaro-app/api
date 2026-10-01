import type { Provider } from '@nestjs/common';
import { CreateCollectionAssignmentUseCase } from '@/modules/collections/application/use-cases/create-collection-assignment.use-case.js';
import { CreateCollectionVisitUseCase } from '@/modules/collections/application/use-cases/create-collection-visit.use-case.js';
import { GetLoanBalanceUseCase } from '@/modules/collections/application/use-cases/get-loan-balance.use-case.js';
import { ListCollectionAssignmentsUseCase } from '@/modules/collections/application/use-cases/list-collection-assignments.use-case.js';
import { ListCollectionVisitsUseCase } from '@/modules/collections/application/use-cases/list-collection-visits.use-case.js';
import { COLLECTION_ASSIGNMENT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-assignment-repository.token.js';
import { COLLECTION_VISIT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-visit-repository.token.js';
import { PrismaCollectionAssignmentRepository } from '@/modules/collections/infrastructure/persistence/prisma-collection-assignment.repository.js';
import { PrismaCollectionVisitRepository } from '@/modules/collections/infrastructure/persistence/prisma-collection-visit.repository.js';

/** Qué implementa cada puerto del módulo. Vive en `infrastructure` y no en `collections.module.ts`. */
export const collectionsProviders: Provider[] = [
  {
    provide: COLLECTION_ASSIGNMENT_REPOSITORY,
    useClass: PrismaCollectionAssignmentRepository,
  },
  {
    provide: COLLECTION_VISIT_REPOSITORY,
    useClass: PrismaCollectionVisitRepository,
  },
  CreateCollectionAssignmentUseCase,
  ListCollectionAssignmentsUseCase,
  CreateCollectionVisitUseCase,
  ListCollectionVisitsUseCase,
  GetLoanBalanceUseCase,
];
