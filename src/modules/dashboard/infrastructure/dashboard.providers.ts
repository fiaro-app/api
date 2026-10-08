import type { Provider } from '@nestjs/common';
import { GetLenderDashboardUseCase } from '@/modules/dashboard/application/use-cases/get-lender-dashboard.use-case.js';
import { GetLenderStatsExportUseCase } from '@/modules/dashboard/application/use-cases/get-lender-stats-export.use-case.js';
import { GetLenderStatsUseCase } from '@/modules/dashboard/application/use-cases/get-lender-stats.use-case.js';

/** `dashboard` no tiene repositorio propio: solo compone casos de uso de otros módulos. */
export const dashboardProviders: Provider[] = [
  GetLenderDashboardUseCase,
  GetLenderStatsUseCase,
  GetLenderStatsExportUseCase,
];
