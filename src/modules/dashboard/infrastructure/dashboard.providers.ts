import type { Provider } from '@nestjs/common';
import { LenderStatsScope } from '@/modules/dashboard/application/services/lender-stats-scope.js';
import { LoanPortfolioSnapshotService } from '@/modules/dashboard/application/services/loan-portfolio-snapshot.service.js';
import { GetCollectorsTodayUseCase } from '@/modules/dashboard/application/use-cases/get-collectors-today.use-case.js';
import { GetLenderInsightsUseCase } from '@/modules/dashboard/application/use-cases/get-lender-insights.use-case.js';
import { INSIGHTS_READ_REPOSITORY } from '@/modules/dashboard/domain/repositories/insights-read.token.js';
import { PrismaInsightsReadRepository } from '@/modules/dashboard/infrastructure/persistence/prisma-insights-read.repository.js';
import { GetLenderDashboardUseCase } from '@/modules/dashboard/application/use-cases/get-lender-dashboard.use-case.js';
import { GetLenderStatsExportUseCase } from '@/modules/dashboard/application/use-cases/get-lender-stats-export.use-case.js';
import { GetLenderStatsUseCase } from '@/modules/dashboard/application/use-cases/get-lender-stats.use-case.js';
import { ListCollectorPerformanceUseCase } from '@/modules/dashboard/application/use-cases/list-collector-performance.use-case.js';
import { ListTopArrearsUseCase } from '@/modules/dashboard/application/use-cases/list-top-arrears.use-case.js';

/** `dashboard` no tiene repositorio propio: solo compone casos de uso de otros módulos. */
export const dashboardProviders: Provider[] = [
  LoanPortfolioSnapshotService,
  LenderStatsScope,
  GetLenderDashboardUseCase,
  GetCollectorsTodayUseCase,
  GetLenderInsightsUseCase,
  { provide: INSIGHTS_READ_REPOSITORY, useClass: PrismaInsightsReadRepository },
  GetLenderStatsUseCase,
  GetLenderStatsExportUseCase,
  ListTopArrearsUseCase,
  ListCollectorPerformanceUseCase,
];
