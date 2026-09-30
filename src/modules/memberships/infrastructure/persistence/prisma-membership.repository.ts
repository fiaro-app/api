import { Injectable } from '@nestjs/common';
import type { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';
import {
  toMembership,
  toMembershipCreateInput,
} from '@/modules/memberships/infrastructure/persistence/membership.mapper.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/** Guarda a las membresías en PostgreSQL con Prisma. */
@Injectable()
export class PrismaMembershipRepository implements MembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** @param membership - Membresía nueva. */
  async create(membership: Membership): Promise<void> {
    await this.prisma.membership.create({
      data: toMembershipCreateInput(membership),
    });
  }

  /** @param id - Identificador de la membresía. */
  async findById(id: string): Promise<Membership | null> {
    const row = await this.prisma.membership.findUnique({ where: { id } });
    return row === null ? null : toMembership(row);
  }

  /** @param userId - La persona. */
  async findActiveByUserId(userId: string): Promise<readonly Membership[]> {
    const rows = await this.prisma.membership.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toMembership);
  }
}
