import { Inject, Injectable } from '@nestjs/common';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';
import type {
  VerificationCode,
  VerificationCodeRepository,
} from '@/modules/auth/domain/repositories/verification-code.repository.js';

/** Guarda los códigos de un solo uso en la tabla `verifications` de better-auth con Prisma. */
@Injectable()
export class PrismaVerificationCodeRepository implements VerificationCodeRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  /**
   * @remarks
   * Borra cualquier código pendiente del mismo identificador antes de crear el nuevo, en una sola
   * transacción: nunca queda más de uno vigente ni una ventana en la que no haya ninguno.
   *
   * @param identifier - A qué pertenece el código.
   * @param hashedValue - Hash del código.
   * @param expiresAt - Cuándo vence.
   */
  async replace(
    identifier: string,
    hashedValue: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.verification.deleteMany({ where: { identifier } }),
      this.prisma.verification.create({
        data: {
          id: this.ids.next(),
          identifier,
          value: hashedValue,
          expiresAt,
        },
      }),
    ]);
  }

  /** @param identifier - A qué pertenece el código. */
  async find(identifier: string): Promise<VerificationCode | null> {
    const found = await this.prisma.verification.findFirst({
      where: { identifier },
      orderBy: { createdAt: 'desc' },
    });
    return found === null
      ? null
      : { hashedValue: found.value, expiresAt: found.expiresAt };
  }

  /** @param identifier - A qué pertenece el código. */
  async delete(identifier: string): Promise<void> {
    await this.prisma.verification.deleteMany({ where: { identifier } });
  }
}
