import { Inject, Injectable } from '@nestjs/common';
import type {
  ListNotificationsInput,
  NotificationsPageResult,
} from '@/modules/notifications/application/dtos/notification-details.dto.js';
import { toNotificationDetails } from '@/modules/notifications/application/dtos/notification-details.mapper.js';
import type { NotificationRepository } from '@/modules/notifications/domain/repositories/notification.repository.js';
import { NOTIFICATION_REPOSITORY } from '@/modules/notifications/domain/tokens/notification-repository.token.js';

/**
 * Lista, paginadas, las notificaciones de la sesión para el prestamista con el que opera.
 * Cualquier rol puede verla: son siempre las propias.
 */
@Injectable()
export class ListNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
  ) {}

  /** @param input - Quién las recibe, el prestamista, la paginación y los filtros opcionales. */
  async execute(
    input: ListNotificationsInput,
  ): Promise<NotificationsPageResult> {
    const page = await this.notifications.list(input);
    return {
      items: page.items.map(toNotificationDetails),
      total: page.total,
    };
  }
}
