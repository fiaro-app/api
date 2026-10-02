import { Injectable } from '@nestjs/common';
import type { Notification } from '@/modules/notifications/domain/entities/notification.entity.js';
import type {
  ListNotificationsCriteria,
  NotificationRepository,
  NotificationsPage,
} from '@/modules/notifications/domain/repositories/notification.repository.js';
import { toNotification } from '@/modules/notifications/infrastructure/persistence/notification.mapper.js';
import type { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/** Guarda a las notificaciones en PostgreSQL con Prisma. */
@Injectable()
export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** @param notification - Notificación nueva. */
  async create(notification: Notification): Promise<void> {
    await this.prisma.notification.create({
      data: {
        id: notification.id,
        recipientUserId: notification.recipientUserId,
        lenderId: notification.lenderId,
        severity: notification.severity,
        title: notification.title,
        body: notification.body,
        relatedEntityType: notification.relatedEntityType,
        relatedEntityId: notification.relatedEntityId,
        readAt: notification.readAt,
        createdAt: notification.createdAt,
      },
    });
  }

  /**
   * @param id - Identificador de la notificación.
   * @param recipientUserId - Quién la recibe.
   */
  async findById(
    id: string,
    recipientUserId: string,
  ): Promise<Notification | null> {
    const row = await this.prisma.notification.findFirst({
      where: { id, recipientUserId },
    });
    return row === null ? null : toNotification(row);
  }

  /** @param criteria - Quién las recibe, la paginación y los filtros opcionales. */
  async list(criteria: ListNotificationsCriteria): Promise<NotificationsPage> {
    const where: Prisma.NotificationWhereInput = {
      recipientUserId: criteria.recipientUserId,
      ...(criteria.lenderId ? { lenderId: criteria.lenderId } : {}),
      ...(criteria.unreadOnly ? { readAt: null } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (criteria.page - 1) * criteria.pageSize,
        take: criteria.pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return { items: rows.map(toNotification), total };
  }

  /**
   * @param id - La notificación, ya validada como propia.
   * @param readAt - Cuándo se marcó como leída.
   */
  async markAsRead(id: string, readAt: Date): Promise<Notification> {
    const row = await this.prisma.notification.update({
      where: { id },
      data: { readAt },
    });
    return toNotification(row);
  }
}
