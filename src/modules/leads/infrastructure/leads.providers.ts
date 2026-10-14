import type { Provider } from '@nestjs/common';
import { LEAD_NOTIFICATION_SETTINGS } from '@/modules/leads/application/ports/lead-notification-settings.token.js';
import { LeadNotifier } from '@/modules/leads/application/services/lead-notifier.js';
import { CreateLeadUseCase } from '@/modules/leads/application/use-cases/create-lead.use-case.js';
import { LEAD_REPOSITORY } from '@/modules/leads/domain/tokens/lead-repository.token.js';
import { EnvLeadNotificationSettings } from '@/modules/leads/infrastructure/settings/env-lead-notification-settings.js';
import { PrismaLeadRepository } from '@/modules/leads/infrastructure/persistence/prisma-lead.repository.js';

/** Qué implementa cada puerto del módulo. */
export const leadsProviders: Provider[] = [
  { provide: LEAD_REPOSITORY, useClass: PrismaLeadRepository },
  {
    provide: LEAD_NOTIFICATION_SETTINGS,
    useClass: EnvLeadNotificationSettings,
  },
  LeadNotifier,
  CreateLeadUseCase,
];
