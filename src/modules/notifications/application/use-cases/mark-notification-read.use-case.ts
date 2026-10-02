import { Inject, Injectable } from '@nestjs/common';
import type { NotificationDetails } from '@/modules/notifications/application/dtos/notification-details.dto.js';
import { toNotificationDetails } from '@/modules/notifications/application/dtos/notification-details.mapper.js';
import { NotificationNotFoundError } from '@/modules/notifications/domain/errors/notification-not-found.error.js';
import type { NotificationRepository } from '@/modules/notifications/domain/repositories/notification.repository.js';
import { NOTIFICATION_REPOSITORY } from '@/modules/notifications/domain/tokens/notification-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/**
 * Marca como leída una notificación propia. Volver a marcarla no hace nada raro: `readAt` se
 * reemplaza por la hora actual, no se exige que siga `null`.
 */
@Injectable()
export class MarkNotificationReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param id - La notificación.
   * @param recipientUserId - Quién la recibe, de la sesión.
   * @throws {@link NotificationNotFoundError} Si no existe para esta persona.
   */
  async execute(
    id: string,
    recipientUserId: string,
  ): Promise<NotificationDetails> {
    const existing = await this.notifications.findById(id, recipientUserId);
    if (existing === null) {
      throw new NotificationNotFoundError();
    }
    const read = await this.notifications.markAsRead(id, this.clock.now());
    return toNotificationDetails(read);
  }
}
