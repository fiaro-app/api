import { Injectable } from '@nestjs/common';
import type { Notification } from '@/modules/notifications/domain/entities/notification.entity.js';
import type {
  DeleteNotificationsCriteria,
  ListNotificationsCriteria,
  NotificationRepository,
  NotificationsPage,
  UnreadNotificationsCriteria,
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

  /** @param criteria - Quién las recibe y, opcionalmente, de qué prestamista. */
  async countUnread(criteria: UnreadNotificationsCriteria): Promise<number> {
    return await this.prisma.notification.count({
      where: unreadWhere(criteria),
    });
  }

  /**
   * @param criteria - Quién las recibe y, opcionalmente, de qué prestamista.
   * @param readAt - Cuándo se marcaron como leídas.
   */
  async markAllAsRead(
    criteria: UnreadNotificationsCriteria,
    readAt: Date,
  ): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: unreadWhere(criteria),
      data: { readAt },
    });
    return result.count;
  }

  /**
   * @param id - La notificación, ya validada como propia.
   * @param recipientUserId - Quién la recibe.
   */
  async delete(id: string, recipientUserId: string): Promise<void> {
    await this.prisma.notification.deleteMany({
      where: { id, recipientUserId },
    });
  }

  /** @param criteria - Quién las recibe, de qué prestamista y si solo las leídas. */
  async deleteMany(criteria: DeleteNotificationsCriteria): Promise<number> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        recipientUserId: criteria.recipientUserId,
        ...(criteria.lenderId ? { lenderId: criteria.lenderId } : {}),
        ...(criteria.onlyRead ? { readAt: { not: null } } : {}),
      },
    });
    return result.count;
  }

  /** @param before - Lo creado antes de este momento se borra. */
  async deleteOlderThan(before: Date): Promise<number> {
    const result = await this.prisma.notification.deleteMany({
      where: { createdAt: { lt: before } },
    });
    return result.count;
  }
}

/** @param criteria - Quién las recibe y, opcionalmente, de qué prestamista. */
function unreadWhere(
  criteria: UnreadNotificationsCriteria,
): Prisma.NotificationWhereInput {
  return {
    recipientUserId: criteria.recipientUserId,
    readAt: null,
    ...(criteria.lenderId ? { lenderId: criteria.lenderId } : {}),
  };
}
