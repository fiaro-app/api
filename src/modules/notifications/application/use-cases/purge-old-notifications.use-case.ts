import { Inject, Injectable } from '@nestjs/common';
import type { NotificationRepository } from '@/modules/notifications/domain/repositories/notification.repository.js';
import { NOTIFICATION_REPOSITORY } from '@/modules/notifications/domain/tokens/notification-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Retención: borra las notificaciones de cualquier persona con más de `retentionDays` días, para que
 * la tabla no crezca sin límite. Quien las prefiera borrar antes puede hacerlo (D-142).
 */
@Injectable()
export class PurgeOldNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param retentionDays - Cuántos días se conservan.
   * @returns Cuántas borró.
   */
  async execute(retentionDays: number): Promise<number> {
    const before = new Date(
      this.clock.now().getTime() - retentionDays * DAY_MS,
    );
    return await this.notifications.deleteOlderThan(before);
  }
}
