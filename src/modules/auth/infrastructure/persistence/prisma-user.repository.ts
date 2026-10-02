import { Inject, Injectable } from '@nestjs/common';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';
import type { User } from '@/modules/auth/domain/entities/user.entity.js';
import { PhoneAlreadyRegisteredError } from '@/modules/auth/domain/errors/phone-already-registered.error.js';
import type {
  ProfileUpdate,
  UserRepository,
} from '@/modules/auth/domain/repositories/user.repository.js';
import {
  CREDENTIAL_PROVIDER,
  toUser,
  toUserCreateInput,
} from '@/modules/auth/infrastructure/persistence/user.mapper.js';

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

  /** @param phone - Celular en formato E.164. */
  async findByPhone(phone: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { phone } });
    return row === null ? null : toUser(row);
  }

  /** @param id - Identificador de la persona. */
  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row === null ? null : toUser(row);
  }

  /**
   * @param userId - La persona.
   * @param passwordHash - Hash de la contraseña nueva.
   */
  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.account.update({
      where: {
        providerId_accountId: {
          providerId: CREDENTIAL_PROVIDER,
          accountId: userId,
        },
      },
      data: { password: passwordHash },
    });
  }

  /**
   * @remarks
   * El hash vive en `account` y `mustChangePassword` en `user`: una transacción evita que un
   * fallo a mitad de camino deje la contraseña nueva sin exigir el cambio, o viceversa.
   *
   * @param userId - La persona.
   * @param passwordHash - Hash de la contraseña temporal.
   */
  async resetToTemporaryPassword(
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.account.update({
        where: {
          providerId_accountId: {
            providerId: CREDENTIAL_PROVIDER,
            accountId: userId,
          },
        },
        data: { password: passwordHash },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { mustChangePassword: true },
      }),
    ]);
  }

  /** @param userId - La persona. */
  async markContactEmailVerified(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { contactEmailVerified: true },
    });
  }

  /**
   * @param userId - La persona.
   * @param update - Los datos nuevos.
   */
  async updateProfile(userId: string, update: ProfileUpdate): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: update.fullName,
        contactEmail: update.contactEmail,
        contactEmailVerified: update.contactEmailVerified,
      },
    });
  }

  /** @param userId - La persona. */
  async findPasswordHash(userId: string): Promise<string | null> {
    const account = await this.prisma.account.findUnique({
      where: {
        providerId_accountId: {
          providerId: CREDENTIAL_PROVIDER,
          accountId: userId,
        },
      },
    });
    return account?.password ?? null;
  }

  /**
   * @param userId - La persona.
   * @param deactivatedAt - Cuándo se desactivó.
   */
  async deactivate(userId: string, deactivatedAt: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { deactivatedAt },
    });
  }
}
