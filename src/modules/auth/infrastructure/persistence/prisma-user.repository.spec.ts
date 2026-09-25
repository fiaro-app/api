import { describe, expect, it, vi } from 'vitest';
import { MobilePhone } from '@/shared/domain/value-objects/mobile-phone.value-object.js';
import { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';
import { User } from '@/modules/auth/domain/entities/user.entity.js';
import { PhoneAlreadyRegisteredError } from '@/modules/auth/domain/errors/phone-already-registered.error.js';
import { PrismaUserRepository } from '@/modules/auth/infrastructure/persistence/prisma-user.repository.js';

const user = User.create({
  id: 'user-1',
  phone: MobilePhone.parse('+573001234567'),
  fullName: 'Ana Pérez',
  contactEmail: null,
  nationalId: null,
  mustChangePassword: false,
  createdAt: new Date('2026-09-23T17:00:00Z'),
});

function setup(behavior: () => Promise<unknown>) {
  const create = vi.fn<(args: unknown) => Promise<unknown>>(() => behavior());
  const repository = new PrismaUserRepository(
    { user: { create } } as unknown as PrismaService,
    { next: () => 'account-1' },
  );
  return { repository, create };
}

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('error de prueba', {
    code,
    clientVersion: 'test',
  });

describe('PrismaUserRepository.create', () => {
  it('guarda al usuario y su credencial en una sola operación', async () => {
    const { repository, create } = setup(() => Promise.resolve({}));

    await repository.create(user, 'hash-de-la-contraseña');

    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      data: {
        id: 'user-1',
        phone: '+573001234567',
        accounts: {
          create: { id: 'account-1', password: 'hash-de-la-contraseña' },
        },
      },
    });
  });

  it('traduce la violación de unicidad de la base de datos a PhoneAlreadyRegisteredError', async () => {
    const { repository } = setup(() => Promise.reject(prismaError('P2002')));

    await expect(repository.create(user, 'hash')).rejects.toBeInstanceOf(
      PhoneAlreadyRegisteredError,
    );
  });

  it('deja pasar cualquier otro error de Prisma', async () => {
    const failure = prismaError('P1001');
    const { repository } = setup(() => Promise.reject(failure));

    await expect(repository.create(user, 'hash')).rejects.toBe(failure);
  });

  it('deja pasar los errores que no son de Prisma', async () => {
    const failure = new Error('se cayó la red');
    const { repository } = setup(() => Promise.reject(failure));

    await expect(repository.create(user, 'hash')).rejects.toBe(failure);
  });
});
