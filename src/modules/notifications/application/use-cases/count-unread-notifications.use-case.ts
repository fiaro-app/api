import { Inject, Injectable } from '@nestjs/common';
import type { UnreadNotificationsInput } from '@/modules/notifications/application/dtos/notification-details.dto.js';
import type { NotificationRepository } from '@/modules/notifications/domain/repositories/notification.repository.js';
import { NOTIFICATION_REPOSITORY } from '@/modules/notifications/domain/tokens/notification-repository.token.js';

/**
 * Cuenta las notificaciones propias que siguen sin leer: la insignia de la barra lateral. Una
 * sola consulta de conteo, sin traer ninguna fila. Cualquier rol puede verla: son siempre las
 * propias.
 */
@Injectable()
export class CountUnreadNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
  ) {}

  /**
   * @param input - Quién las recibe y, opcionalmente, de qué prestamista.
   * @returns Cuántas siguen sin leer.
   */
  async execute(input: UnreadNotificationsInput): Promise<number> {
    return await this.notifications.countUnread(input);
  }
}
