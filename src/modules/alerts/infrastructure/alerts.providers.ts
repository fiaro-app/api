import type { Provider } from '@nestjs/common';
import { SendMoraAlertsUseCase } from '@/modules/alerts/application/use-cases/send-mora-alerts.use-case.js';
import { RunMoraAlertsUseCase } from '@/modules/alerts/application/use-cases/run-mora-alerts.use-case.js';
import { RunSubscriptionRemindersUseCase } from '@/modules/alerts/application/use-cases/run-subscription-reminders.use-case.js';
import { SendSubscriptionRemindersUseCase } from '@/modules/alerts/application/use-cases/send-subscription-reminders.use-case.js';
import { SUBSCRIPTION_REMINDER_RUN_REPOSITORY } from '@/modules/alerts/domain/tokens/subscription-reminder-run-repository.token.js';
import { PrismaSubscriptionReminderRunRepository } from '@/modules/alerts/infrastructure/persistence/prisma-subscription-reminder-run.repository.js';
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
  {
    provide: SUBSCRIPTION_REMINDER_RUN_REPOSITORY,
    useClass: PrismaSubscriptionReminderRunRepository,
  },
  SendMoraAlertsUseCase,
  RunMoraAlertsUseCase,
  SendSubscriptionRemindersUseCase,
  RunSubscriptionRemindersUseCase,
  MoraAlertScheduler,
];
