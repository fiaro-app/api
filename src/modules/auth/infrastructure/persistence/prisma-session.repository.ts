import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';
import type { SessionRepository } from '@/modules/auth/domain/repositories/session.repository.js';

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
}
