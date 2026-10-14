import { Inject, Injectable } from '@nestjs/common';
import type {
  CreateNotificationInput,
  NotificationDetails,
} from '@/modules/notifications/application/dtos/notification-details.dto.js';
import { toNotificationDetails } from '@/modules/notifications/application/dtos/notification-details.mapper.js';
import { DeliverNotificationUseCase } from '@/modules/notifications/application/use-cases/deliver-notification.use-case.js';
import { Notification } from '@/modules/notifications/domain/entities/notification.entity.js';
import type { NotificationRepository } from '@/modules/notifications/domain/repositories/notification.repository.js';
import { NOTIFICATION_REPOSITORY } from '@/modules/notifications/domain/tokens/notification-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';

/**
 * Crea una notificación para una sola persona, la guarda en el feed y la entrega por sus canales
 * (`DeliverNotificationUseCase`, D-94). Uso interno: la llaman otros casos de uso, de este módulo
 * o de otros por la capa de aplicación (`CreateCollectionAssignmentUseCase`,
 * `SubmitSettlementUseCase`, `ReviewSettlementUseCase`) — nunca una ruta HTTP, porque nadie crea
 * sus propias notificaciones (PRODUCT.md §5: siempre las genera el sistema).
 *
 * @remarks
 * Quien llama ya resolvió el destinatario: esta clase no sabe de membresías, a propósito (ver
 * `notifications.providers.ts`).
 */
@Injectable()
export class CreateNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly deliver: DeliverNotificationUseCase,
  ) {}

  /**
   * @param input - Destinatario, prestamista, texto y la entidad relacionada, si hay una.
   * @returns La notificación guardada, tal como la lee la app.
   */
  async execute(input: CreateNotificationInput): Promise<NotificationDetails> {
    const notification = Notification.create({
      id: this.ids.next(),
      recipientUserId: input.recipientUserId,
      lenderId: input.lenderId,
      severity: input.severity,
      title: input.title,
      body: input.body,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      readAt: null,
      createdAt: this.clock.now(),
    });
    await this.notifications.create(notification);
    await this.deliver.execute(notification);
    return toNotificationDetails(notification);
  }
}
