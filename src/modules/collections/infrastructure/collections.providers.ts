import type { Provider } from '@nestjs/common';
import { CreateCollectionAssignmentUseCase } from '@/modules/collections/application/use-cases/create-collection-assignment.use-case.js';
import { CreateCollectionVisitUseCase } from '@/modules/collections/application/use-cases/create-collection-visit.use-case.js';
import { CreatePaymentReversalUseCase } from '@/modules/collections/application/use-cases/create-payment-reversal.use-case.js';
import { DeactivateCollectorUseCase } from '@/modules/collections/application/use-cases/deactivate-collector.use-case.js';
import { GetCollectorDailySummaryUseCase } from '@/modules/collections/application/use-cases/get-collector-daily-summary.use-case.js';
import { GetCollectorRouteUseCase } from '@/modules/collections/application/use-cases/get-collector-route.use-case.js';
import { GetCollectorStatsUseCase } from '@/modules/collections/application/use-cases/get-collector-stats.use-case.js';
import { GetManagedCollectorStatsUseCase } from '@/modules/collections/application/use-cases/get-managed-collector-stats.use-case.js';
import { ListClientsWithBalanceUseCase } from '@/modules/collections/application/use-cases/list-clients-with-balance.use-case.js';
import { ListLoanBalancesUseCase } from '@/modules/collections/application/use-cases/list-loan-balances.use-case.js';
import { ListLoansWithBalanceUseCase } from '@/modules/collections/application/use-cases/list-loans-with-balance.use-case.js';
import { GetLoanBalanceUseCase } from '@/modules/collections/application/use-cases/get-loan-balance.use-case.js';
import { GetLoanInstallmentsUseCase } from '@/modules/collections/application/use-cases/get-loan-installments.use-case.js';
import { ListCollectionAssignmentsUseCase } from '@/modules/collections/application/use-cases/list-collection-assignments.use-case.js';
import { ListCollectionVisitsUseCase } from '@/modules/collections/application/use-cases/list-collection-visits.use-case.js';
import { SummarizeCollectionRoutesUseCase } from '@/modules/collections/application/use-cases/summarize-collection-routes.use-case.js';
import { GetPaymentCollectorUseCase } from '@/modules/collections/application/use-cases/get-payment-collector.use-case.js';
import { SearchCollectionVisitsUseCase } from '@/modules/collections/application/use-cases/search-collection-visits.use-case.js';
import { COLLECTION_ASSIGNMENT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-assignment-repository.token.js';
import { LOAN_PORTFOLIO_READ_REPOSITORY } from '@/modules/collections/domain/tokens/loan-portfolio-read-repository.token.js';
import { COLLECTION_VISIT_REPORT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-visit-report-repository.token.js';
import { COLLECTION_VISIT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-visit-repository.token.js';
import { PAYMENT_REVERSAL_REPOSITORY } from '@/modules/collections/domain/tokens/payment-reversal-repository.token.js';
import { PAYMENT_REPOSITORY } from '@/modules/collections/domain/tokens/payment-repository.token.js';
import { PrismaCollectionAssignmentRepository } from '@/modules/collections/infrastructure/persistence/prisma-collection-assignment.repository.js';
import { PrismaLoanPortfolioReadRepository } from '@/modules/collections/infrastructure/persistence/prisma-loan-portfolio-read.repository.js';
import { PrismaCollectionVisitReportRepository } from '@/modules/collections/infrastructure/persistence/prisma-collection-visit-report.repository.js';
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
  {
    provide: COLLECTION_VISIT_REPORT_REPOSITORY,
    useClass: PrismaCollectionVisitReportRepository,
  },
  {
    provide: LOAN_PORTFOLIO_READ_REPOSITORY,
    useClass: PrismaLoanPortfolioReadRepository,
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
  SearchCollectionVisitsUseCase,
  GetPaymentCollectorUseCase,
  SummarizeCollectionRoutesUseCase,
  GetLoanBalanceUseCase,
  GetLoanInstallmentsUseCase,
  CreatePaymentReversalUseCase,
  GetCollectorRouteUseCase,
  DeactivateCollectorUseCase,
  GetCollectorDailySummaryUseCase,
  GetCollectorStatsUseCase,
  GetManagedCollectorStatsUseCase,
  ListLoansWithBalanceUseCase,
  ListClientsWithBalanceUseCase,
  ListLoanBalancesUseCase,
];

/**
 * Lo que `collections` expone a otros módulos: el saldo de un préstamo, que usa el aviso de
 * mora (D-96); el resumen del día de un cobrador, que reusa el resumen del Lender (D-99) para
 * "cobrado hoy", "efectividad general" y la alerta de cobradores sin ruta iniciada; sus
 * estadísticas de período, que reusan las estadísticas del Lender (D-100) para el desempeño por
 * cobrador; y el historial de asignaciones de un préstamo, que esas mismas estadísticas del
 * Lender reusan para saber a qué cobrador (y a qué cartera, a través de él) tiene asignado hoy —
 * ninguna repite esa composición. `ListLoanBalancesUseCase` da esos saldos y cobradores en tandas
 * para la foto de la cartera de las estadísticas (D-119).
 */
export const collectionsExports = [
  GetLoanBalanceUseCase,
  ListLoanBalancesUseCase,
  GetCollectorDailySummaryUseCase,
  GetCollectorStatsUseCase,
  ListCollectionAssignmentsUseCase,
  CreateCollectionAssignmentUseCase,
  GetPaymentCollectorUseCase,
];
