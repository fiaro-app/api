import { Inject, Injectable } from '@nestjs/common';
import type { UnreadNotificationsInput } from '@/modules/notifications/application/dtos/notification-details.dto.js';
import type { NotificationRepository } from '@/modules/notifications/domain/repositories/notification.repository.js';
import { NOTIFICATION_REPOSITORY } from '@/modules/notifications/domain/tokens/notification-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/**
 * Marca como leídas todas las notificaciones propias que siguen sin leer, en una sola operación
 * (no una por notificación). Las que ya estaban leídas conservan su `readAt`; repetirlo no
 * falla, solo devuelve cero.
 */
@Injectable()
export class MarkAllNotificationsReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param input - Quién las recibe y, opcionalmente, de qué prestamista.
   * @returns Cuántas marcó.
   */
  async execute(input: UnreadNotificationsInput): Promise<number> {
    return await this.notifications.markAllAsRead(input, this.clock.now());
  }
}
