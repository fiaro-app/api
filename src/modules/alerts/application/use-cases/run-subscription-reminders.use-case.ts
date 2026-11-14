import { Inject, Injectable } from '@nestjs/common';
import { SendSubscriptionRemindersUseCase } from '@/modules/alerts/application/use-cases/send-subscription-reminders.use-case.js';
import type { SubscriptionReminderRunRepository } from '@/modules/alerts/domain/repositories/subscription-reminder-run.repository.js';
import { SUBSCRIPTION_REMINDER_RUN_REPOSITORY } from '@/modules/alerts/domain/tokens/subscription-reminder-run-repository.token.js';

/**
 * Manda los recordatorios de vencimiento de un día de negocio, una sola vez (D-150): el primer
 * llamado de ese día los envía y los demás no hacen nada. Así varias instancias o un reinicio el
 * mismo día no duplican avisos. Igual que el aviso de mora (`RunMoraAlertsUseCase`).
 */
@Injectable()
export class RunSubscriptionRemindersUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REMINDER_RUN_REPOSITORY)
    private readonly runs: SubscriptionReminderRunRepository,
    private readonly sendReminders: SendSubscriptionRemindersUseCase,
  ) {}

  /**
   * @param businessDate - El día de negocio, AAAA-MM-DD, en hora de Colombia.
   * @returns `true` si este llamado los envió; `false` si ese día ya estaba reclamado.
   */
  async execute(businessDate: string): Promise<boolean> {
    if (!(await this.runs.claim(businessDate))) {
      return false;
    }
    await this.runs.finish(businessDate, await this.sendReminders.execute());
    return true;
  }
}
