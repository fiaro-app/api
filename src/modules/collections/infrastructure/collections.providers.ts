import type { Provider } from '@nestjs/common';
import { CreateCollectionAssignmentUseCase } from '@/modules/collections/application/use-cases/create-collection-assignment.use-case.js';
import { ListCollectionAssignmentsUseCase } from '@/modules/collections/application/use-cases/list-collection-assignments.use-case.js';
import { COLLECTION_ASSIGNMENT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-assignment-repository.token.js';
import { PrismaCollectionAssignmentRepository } from '@/modules/collections/infrastructure/persistence/prisma-collection-assignment.repository.js';

/** Qué implementa cada puerto del módulo. Vive en `infrastructure` y no en `collections.module.ts`. */
export const collectionsProviders: Provider[] = [
  {
    provide: COLLECTION_ASSIGNMENT_REPOSITORY,
    useClass: PrismaCollectionAssignmentRepository,
  },
  CreateCollectionAssignmentUseCase,
  ListCollectionAssignmentsUseCase,
];
