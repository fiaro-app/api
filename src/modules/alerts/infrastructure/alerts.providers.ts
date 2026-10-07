import type { Provider } from '@nestjs/common';
import { SendMoraAlertsUseCase } from '@/modules/alerts/application/use-cases/send-mora-alerts.use-case.js';
import { RunMoraAlertsUseCase } from '@/modules/alerts/application/use-cases/run-mora-alerts.use-case.js';
import { MORA_ALERT_RUN_REPOSITORY } from '@/modules/alerts/domain/tokens/mora-alert-run-repository.token.js';
import { PrismaMoraAlertRunRepository } from '@/modules/alerts/infrastructure/persistence/prisma-mora-alert-run.repository.js';
import { MoraAlertScheduler } from '@/modules/alerts/infrastructure/scheduling/mora-alert.scheduler.js';

/**
 * Qué implementa cada puerto del módulo. `MoraAlertScheduler` no se exporta: el envío diario no lo
 * llama nadie más, solo arranca con la aplicación.
 */
export const alertsProviders: Provider[] = [
  {
    provide: MORA_ALERT_RUN_REPOSITORY,
    useClass: PrismaMoraAlertRunRepository,
  },
  SendMoraAlertsUseCase,
  RunMoraAlertsUseCase,
  MoraAlertScheduler,
];
