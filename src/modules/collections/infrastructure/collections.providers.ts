import type { Provider } from '@nestjs/common';
import { CreateCollectionAssignmentUseCase } from '@/modules/collections/application/use-cases/create-collection-assignment.use-case.js';
import { CreateCollectionVisitUseCase } from '@/modules/collections/application/use-cases/create-collection-visit.use-case.js';
import { CreatePaymentReversalUseCase } from '@/modules/collections/application/use-cases/create-payment-reversal.use-case.js';
import { DeactivateCollectorUseCase } from '@/modules/collections/application/use-cases/deactivate-collector.use-case.js';
import { GetCollectorDailySummaryUseCase } from '@/modules/collections/application/use-cases/get-collector-daily-summary.use-case.js';
import { GetCollectorRouteUseCase } from '@/modules/collections/application/use-cases/get-collector-route.use-case.js';
import { GetCollectorStatsUseCase } from '@/modules/collections/application/use-cases/get-collector-stats.use-case.js';
import { GetLoanBalanceUseCase } from '@/modules/collections/application/use-cases/get-loan-balance.use-case.js';
import { ListCollectionAssignmentsUseCase } from '@/modules/collections/application/use-cases/list-collection-assignments.use-case.js';
import { ListCollectionVisitsUseCase } from '@/modules/collections/application/use-cases/list-collection-visits.use-case.js';
import { COLLECTION_ASSIGNMENT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-assignment-repository.token.js';
import { COLLECTION_VISIT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-visit-repository.token.js';
import { PAYMENT_REVERSAL_REPOSITORY } from '@/modules/collections/domain/tokens/payment-reversal-repository.token.js';
import { PAYMENT_REPOSITORY } from '@/modules/collections/domain/tokens/payment-repository.token.js';
import { PrismaCollectionAssignmentRepository } from '@/modules/collections/infrastructure/persistence/prisma-collection-assignment.repository.js';
import { PrismaCollectionVisitRepository } from '@/modules/collections/infrastructure/persistence/prisma-collection-visit.repository.js';
import { PrismaPaymentReversalRepository } from '@/modules/collections/infrastructure/persistence/prisma-payment-reversal.repository.js';
import { PrismaPaymentRepository } from '@/modules/collections/infrastructure/persistence/prisma-payment.repository.js';

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
  { provide: PAYMENT_REPOSITORY, useClass: PrismaPaymentRepository },
  {
    provide: PAYMENT_REVERSAL_REPOSITORY,
    useClass: PrismaPaymentReversalRepository,
  },
  CreateCollectionAssignmentUseCase,
  ListCollectionAssignmentsUseCase,
  CreateCollectionVisitUseCase,
  ListCollectionVisitsUseCase,
  GetLoanBalanceUseCase,
  CreatePaymentReversalUseCase,
  GetCollectorRouteUseCase,
  DeactivateCollectorUseCase,
  GetCollectorDailySummaryUseCase,
  GetCollectorStatsUseCase,
];

/** Lo que `collections` expone a otros módulos: el saldo de un préstamo, que usa el aviso de mora (D-96). */
export const collectionsExports = [GetLoanBalanceUseCase];
