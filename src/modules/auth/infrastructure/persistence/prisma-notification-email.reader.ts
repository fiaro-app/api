import { Injectable } from '@nestjs/common';
import type { NotificationEmailReader } from '@/modules/auth/application/ports/notification-email-reader.port.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/**
 * Lee de PostgreSQL el correo al que sale una notificación. La regla vive en el `where`: solo
 * cuenta un correo que la persona verificó (D-69) y solo si su cuenta sigue activa (D-71); una
 * cuenta desactivada no recibe correos.
 */
@Injectable()
export class PrismaNotificationEmailReader implements NotificationEmailReader {
  constructor(private readonly prisma: PrismaService) {}

  /** @param userId - La persona que recibe la notificación. */
  async findVerifiedContactEmail(userId: string): Promise<string | null> {
    const row = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deactivatedAt: null,
        contactEmailVerified: true,
        contactEmail: { not: null },
      },
      select: { contactEmail: true },
    });
    return row === null ? null : row.contactEmail;
  }
}
