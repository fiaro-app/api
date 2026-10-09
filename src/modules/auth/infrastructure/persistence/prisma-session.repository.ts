import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';
import type {
  ActiveSession,
  SessionRepository,
} from '@/modules/auth/domain/repositories/session.repository.js';

/** Cierra sesiones borrando sus filas de PostgreSQL con Prisma. */
@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** @param userId - La persona. */
  async revokeAllForUser(userId: string): Promise<number> {
    const { count } = await this.prisma.session.deleteMany({
      where: { userId },
    });
    return count;
  }

  /**
   * @param userId - La persona.
   * @param now - El momento de la consulta.
   */
  async listActiveForUser(
    userId: string,
    now: Date,
  ): Promise<readonly ActiveSession[]> {
    const rows = await this.prisma.session.findMany({
      where: { userId, expiresAt: { gt: now } },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
      },
    });
    return rows.map((row) => ({
      id: row.id,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      createdAt: row.createdAt,
      lastUsedAt: row.updatedAt,
      expiresAt: row.expiresAt,
    }));
  }

  /**
   * @param sessionId - La sesión.
   * @param userId - La persona dueña.
   */
  async revokeOne(sessionId: string, userId: string): Promise<boolean> {
    const { count } = await this.prisma.session.deleteMany({
      where: { id: sessionId, userId },
    });
    return count > 0;
  }
}
