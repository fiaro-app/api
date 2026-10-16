import { Injectable } from '@nestjs/common';
import type { AttachmentKind } from '@/modules/attachments/domain/attachment-kind.js';
import type { AttachmentRepository } from '@/modules/attachments/domain/repositories/attachment.repository.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/** Guarda las llaves de las fotos privadas en PostgreSQL con Prisma. */
@Injectable()
export class PrismaAttachmentRepository implements AttachmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @param kind - El tipo de foto.
   * @param ownerId - El cliente o el pago.
   */
  async findKey(kind: AttachmentKind, ownerId: string): Promise<string | null> {
    const row = await this.prisma.attachment.findUnique({
      where: { kind_ownerId: { kind, ownerId } },
      select: { key: true },
    });
    return row?.key ?? null;
  }

  /** @param input - La foto nueva y de quién es. */
  async replace(input: {
    readonly id: string;
    readonly lenderId: string;
    readonly kind: AttachmentKind;
    readonly ownerId: string;
    readonly key: string;
  }): Promise<string | null> {
    const where = {
      kind_ownerId: { kind: input.kind, ownerId: input.ownerId },
    };
    return await this.prisma.$transaction(async (tx) => {
      const previous = await tx.attachment.findUnique({
        where,
        select: { key: true },
      });
      await tx.attachment.upsert({
        where,
        create: {
          id: input.id,
          lenderId: input.lenderId,
          kind: input.kind,
          ownerId: input.ownerId,
          key: input.key,
        },
        update: { key: input.key },
      });
      return previous?.key ?? null;
    });
  }

  /**
   * @param kind - El tipo de foto.
   * @param ownerId - El cliente o el pago.
   */
  async remove(kind: AttachmentKind, ownerId: string): Promise<string | null> {
    const previous = await this.findKey(kind, ownerId);
    if (previous !== null) {
      await this.prisma.attachment.deleteMany({ where: { kind, ownerId } });
    }
    return previous;
  }
}
