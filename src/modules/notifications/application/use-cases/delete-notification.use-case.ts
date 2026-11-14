import { Inject, Injectable } from '@nestjs/common';
import { NotificationNotFoundError } from '@/modules/notifications/domain/errors/notification-not-found.error.js';
import type { NotificationRepository } from '@/modules/notifications/domain/repositories/notification.repository.js';
import { NOTIFICATION_REPOSITORY } from '@/modules/notifications/domain/tokens/notification-repository.token.js';

/** Borra una notificación propia. Es definitivo: ya no vuelve a aparecer en el feed. */
@Injectable()
export class DeleteNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
  ) {}

  /**
   * @param id - La notificación.
   * @param recipientUserId - Quién la recibe, de la sesión.
   * @throws {@link NotificationNotFoundError} Si no existe para esta persona.
   */
  async execute(id: string, recipientUserId: string): Promise<void> {
    const existing = await this.notifications.findById(id, recipientUserId);
    if (existing === null) {
      throw new NotificationNotFoundError();
    }
    await this.notifications.delete(id, recipientUserId);
  }
}
