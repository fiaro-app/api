import { Injectable } from '@nestjs/common';
import type {
  NotificationRecipient,
  NotificationRecipientReader,
} from '@/modules/auth/application/ports/notification-recipient-reader.port.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/**
 * Lee de PostgreSQL a quién se le puede mandar una notificación. La regla vive en el `where`: una
 * cuenta desactivada (D-71) no recibe nada, y un correo de contacto solo cuenta si la persona lo
 * verificó (D-69).
 */
@Injectable()
export class PrismaNotificationRecipientReader implements NotificationRecipientReader {
  constructor(private readonly prisma: PrismaService) {}

  /** @param userId - La persona que recibe la notificación. */
  async findRecipient(userId: string): Promise<NotificationRecipient | null> {
    const row = await this.prisma.user.findFirst({
      where: { id: userId, deactivatedAt: null },
      select: { contactEmail: true, contactEmailVerified: true },
    });
    if (row === null) {
      return null;
    }
    return {
      verifiedEmail: row.contactEmailVerified ? row.contactEmail : null,
    };
  }
}
