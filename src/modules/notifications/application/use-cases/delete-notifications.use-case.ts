import { Inject, Injectable } from '@nestjs/common';
import type { DeleteNotificationsInput } from '@/modules/notifications/application/dtos/notification-details.dto.js';
import type { NotificationRepository } from '@/modules/notifications/domain/repositories/notification.repository.js';
import { NOTIFICATION_REPOSITORY } from '@/modules/notifications/domain/tokens/notification-repository.token.js';

/**
 * Borra de una vez las notificaciones propias: todas, o solo las ya leídas, y opcionalmente de un
 * solo prestamista. Repetirlo no falla, solo devuelve cero.
 */
@Injectable()
export class DeleteNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
  ) {}

  /**
   * @param input - Quién las recibe, de qué prestamista y si solo las leídas.
   * @returns Cuántas borró.
   */
  async execute(input: DeleteNotificationsInput): Promise<number> {
    return await this.notifications.deleteMany(input);
  }
}
