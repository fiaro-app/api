import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  reminderFor,
  reminderMessage,
} from '@/modules/alerts/domain/subscription-reminder/subscription-reminder.js';
import { CreateNotificationUseCase } from '@/modules/notifications/application/use-cases/create-notification.use-case.js';
import {
  ListRenewalTargetsUseCase,
  type RenewalTarget,
} from '@/modules/subscriptions/application/use-cases/list-renewal-targets.use-case.js';
import { SUBSCRIPTION_GRACE_DAYS } from '@/shared/domain/subscriptions/subscription-status.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Cuántos días antes del vencimiento empieza a mirar la ventana (el primer aviso es a los 7). */
const LOOK_AHEAD_DAYS = 8;
/** Cuántos días después: la gracia más el día del aviso de solo lectura, con un día de margen por el huso. */
const LOOK_BEHIND_DAYS = SUBSCRIPTION_GRACE_DAYS + 2;

/**
 * Recuerda a las dueñas que su plan vence (D-150): a los 7, 3 y 1 días antes, el día del vencimiento,
 * cada día de gracia y el día en que el negocio pasa a solo lectura. Sale por los canales de la dueña
 * (la app, el correo y el push, D-94 y D-95) como una notificación más.
 *
 * @remarks
 * No corre con una sesión: lee la ventana de negocios a punto de vencer y decide por cada uno qué
 * toca hoy. Si avisar a una persona falla se escribe en el log y se sigue con las demás.
 */
@Injectable()
export class SendSubscriptionRemindersUseCase {
  private readonly logger = new Logger(SendSubscriptionRemindersUseCase.name);

  constructor(
    private readonly listTargets: ListRenewalTargetsUseCase,
    private readonly createNotification: CreateNotificationUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** @returns A cuántas personas se les recordó. */
  async execute(): Promise<number> {
    const now = this.clock.now();
    const targets = await this.listTargets.execute(
      new Date(now.getTime() - LOOK_BEHIND_DAYS * DAY_MS),
      new Date(now.getTime() + LOOK_AHEAD_DAYS * DAY_MS),
    );
    const sent = await Promise.all(
      targets.map((target) => this.remind(target, now)),
    );
    return sent.reduce((total, count) => total + count, 0);
  }

  /**
   * @param target - El negocio y sus dueñas.
   * @param now - El momento del envío.
   * @returns A cuántas dueñas se les recordó.
   */
  private async remind(target: RenewalTarget, now: Date): Promise<number> {
    const { subscription, owners } = target;
    const reminder = reminderFor(subscription.currentPeriodEndsAt, now);
    if (reminder === null) {
      return 0;
    }
    const message = reminderMessage(
      reminder,
      subscription.planCode === 'TRIAL',
    );
    const results = await Promise.all(
      owners.map(async (owner) => {
        try {
          await this.createNotification.execute({
            recipientUserId: owner.userId,
            lenderId: owner.lenderId,
            severity: message.severity,
            title: message.title,
            body: message.body,
            relatedEntityType: 'SUBSCRIPTION',
            relatedEntityId: subscription.id,
          });
          return 1;
        } catch (error) {
          this.logger.error(
            `No se pudo recordar el vencimiento al negocio ${subscription.tenantId}: ${String(error)}.`,
          );
          return 0;
        }
      }),
    );
    return results.reduce<number>((total, count) => total + count, 0);
  }
}
