import { Inject, Injectable } from '@nestjs/common';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';
import type { User } from '@/modules/auth/domain/entities/user.entity.js';
import { PhoneAlreadyRegisteredError } from '@/modules/auth/domain/errors/phone-already-registered.error.js';
import type { UserRepository } from '@/modules/auth/domain/repositories/user.repository.js';
import { toUserCreateInput } from '@/modules/auth/infrastructure/persistence/user.mapper.js';

/** Código de Prisma para una restricción de unicidad violada. */
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/** Guarda a las personas en PostgreSQL con Prisma. */
@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  /**
   * @remarks
   * Las dos únicas restricciones de unicidad que puede violar un alta son el celular y el email
   * técnico, que sale del mismo celular: cualquier `P2002` significa «ya tiene cuenta». La
   * base de datos decide, así que dos altas simultáneas del mismo celular no pasan las dos.
   *
   * @param user - Persona nueva.
   * @param passwordHash - Hash de su contraseña.
   * @throws {@link PhoneAlreadyRegisteredError} Si el celular ya tiene cuenta.
   */
  async create(user: User, passwordHash: string): Promise<void> {
    try {
      await this.prisma.user.create({
        data: toUserCreateInput(user, this.ids.next(), passwordHash),
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new PhoneAlreadyRegisteredError();
      }
      throw error;
    }
  }
}
