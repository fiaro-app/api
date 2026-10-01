import { Injectable } from '@nestjs/common';
import type { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';
import { MembershipAlreadyExistsError } from '@/modules/memberships/domain/errors/membership-already-exists.error.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';
import {
  toMembership,
  toMembershipCreateInput,
} from '@/modules/memberships/infrastructure/persistence/membership.mapper.js';
import { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/** Código de Prisma para una restricción de unicidad violada. */
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/** Guarda a las membresías en PostgreSQL con Prisma. */
@Injectable()
export class PrismaMembershipRepository implements MembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @remarks
   * La única restricción de unicidad de una membresía es `(userId, lenderId)`: cualquier
   * `P2002` en este `create` significa que esa persona ya tiene una membresía con este
   * prestamista.
   *
   * @param membership - Membresía nueva.
   * @throws {@link MembershipAlreadyExistsError} Si esa persona ya tiene una membresía con este
   * prestamista.
   */
  async create(membership: Membership): Promise<void> {
    try {
      await this.prisma.membership.create({
        data: toMembershipCreateInput(membership),
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new MembershipAlreadyExistsError();
      }
      throw error;
    }
  }

  /**
   * @param id - Identificador de la membresía.
   * @param lenderId - El prestamista dueño.
   */
  async findById(id: string, lenderId: string): Promise<Membership | null> {
    const row = await this.prisma.membership.findFirst({
      where: { id, lenderId },
    });
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

  /** @param membership - La membresía con sus datos ya actualizados. */
  async update(membership: Membership): Promise<void> {
    await this.prisma.membership.update({
      where: { id: membership.id, lenderId: membership.lenderId },
      data: toMembershipCreateInput(membership),
    });
  }
}
