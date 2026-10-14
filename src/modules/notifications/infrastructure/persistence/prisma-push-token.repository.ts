import { Injectable } from '@nestjs/common';
import { PushToken } from '@/modules/notifications/domain/entities/push-token.entity.js';
import type { PushTokenRepository } from '@/modules/notifications/domain/repositories/push-token.repository.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/** Guarda los tokens de los dispositivos en PostgreSQL con Prisma (D-95). */
@Injectable()
export class PrismaPushTokenRepository implements PushTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** @param pushToken - El token a registrar o a reasignar. */
  async upsert(pushToken: PushToken): Promise<void> {
    await this.prisma.pushToken.upsert({
      where: { token: pushToken.token },
      create: {
        id: pushToken.id,
        token: pushToken.token,
        userId: pushToken.userId,
        createdAt: pushToken.createdAt,
        updatedAt: pushToken.updatedAt,
      },
      update: { userId: pushToken.userId, updatedAt: pushToken.updatedAt },
    });
  }

  /** @param userId - La persona. */
  async listByUser(userId: string): Promise<readonly PushToken[]> {
    const rows = await this.prisma.pushToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) =>
      PushToken.create({
        id: row.id,
        token: row.token,
        userId: row.userId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }),
    );
  }

  /**
   * @param userId - La persona que pide quitarlo.
   * @param token - El token a quitar; si es de otra persona, no se borra nada.
   */
  async deleteForUser(userId: string, token: string): Promise<void> {
    await this.prisma.pushToken.deleteMany({ where: { userId, token } });
  }

  /** @param token - El token a quitar, sea de quien sea. */
  async deleteByToken(token: string): Promise<void> {
    await this.prisma.pushToken.deleteMany({ where: { token } });
  }
}
