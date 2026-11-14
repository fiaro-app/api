import { describe, expect, it, vi } from 'vitest';
import { MobilePhone } from '@/shared/domain/value-objects/mobile-phone.value-object.js';
import { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';
import { User } from '@/modules/auth/domain/entities/user.entity.js';
import { ContactEmailAlreadyRegisteredError } from '@/modules/auth/domain/errors/contact-email-already-registered.error.js';
import { PhoneAlreadyRegisteredError } from '@/modules/auth/domain/errors/phone-already-registered.error.js';
import { PrismaUserRepository } from '@/modules/auth/infrastructure/persistence/prisma-user.repository.js';

const user = User.create({
  id: 'user-1',
  phone: MobilePhone.parse('+573001234567'),
  fullName: 'Ana Pérez',
  contactEmail: null,
  contactEmailVerified: false,
  nationalId: null,
  mustChangePassword: false,
  createdAt: new Date('2026-09-23T17:00:00Z'),
});

function setup(behavior: () => Promise<unknown>) {
  const create = vi.fn<(args: unknown) => Promise<unknown>>(() => behavior());
  const findUnique = vi.fn<(args: unknown) => Promise<unknown>>();
  const findFirst = vi.fn<(args: unknown) => Promise<unknown>>();
  const update = vi.fn<(args: unknown) => Promise<unknown>>();
  const userUpdate = vi.fn<(args: unknown) => Promise<unknown>>();
  const accountFindUnique = vi.fn<(args: unknown) => Promise<unknown>>();
  const repository = new PrismaUserRepository(
    {
      user: { create, findUnique, findFirst, update: userUpdate },
      account: { update, findUnique: accountFindUnique },
    } as unknown as PrismaService,
    { next: () => 'account-1' },
  );
  return {
    repository,
    create,
    findUnique,
    findFirst,
    update,
    userUpdate,
    accountFindUnique,
  };
}

const prismaError = (code: string, meta?: Record<string, unknown>) =>
  new Prisma.PrismaClientKnownRequestError('error de prueba', {
    code,
    clientVersion: 'test',
    meta,
  });

const emailViolation = () =>
  prismaError('P2002', { target: 'users_contact_email_lower_key' });

const ROW = {
  id: 'user-1',
  fullName: 'Ana Pérez',
  phone: '+573001234567',
  contactEmail: 'ana@example.com',
  contactEmailVerified: true,
  nationalId: null,
  mustChangePassword: false,
  createdAt: new Date('2026-09-23T17:00:00Z'),
};

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

  it('traduce la violación del índice del correo de contacto a ContactEmailAlreadyRegisteredError', async () => {
    const { repository } = setup(() => Promise.reject(emailViolation()));

    await expect(repository.create(user, 'hash')).rejects.toBeInstanceOf(
      ContactEmailAlreadyRegisteredError,
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

describe('PrismaUserRepository.findByPhone', () => {
  it('busca por el celular tal cual y convierte la fila en la entidad', async () => {
    const { repository, findUnique } = setup(() => Promise.resolve({}));
    findUnique.mockResolvedValueOnce({
      id: 'user-1',
      fullName: 'Ana Pérez',
      phone: '+573001234567',
      contactEmail: 'ana@example.com',
      contactEmailVerified: false,
      nationalId: '1020304050',
      mustChangePassword: false,
      createdAt: new Date('2026-09-23T17:00:00Z'),
    });

    const found = await repository.findByPhone('+573001234567');

    expect(findUnique).toHaveBeenCalledExactlyOnceWith({
      where: { phone: '+573001234567' },
    });
    expect(found?.id).toBe('user-1');
    expect(found?.phone.value).toBe('+573001234567');
  });

  it('sin una fila con ese celular, devuelve null', async () => {
    const { repository, findUnique } = setup(() => Promise.resolve({}));
    findUnique.mockResolvedValueOnce(null);

    await expect(repository.findByPhone('+573001234567')).resolves.toBeNull();
  });
});

describe('PrismaUserRepository.findByVerifiedContactEmail', () => {
  it('busca sin distinguir mayúsculas y solo entre correos verificados', async () => {
    const { repository, findFirst } = setup(() => Promise.resolve({}));
    findFirst.mockResolvedValueOnce(ROW);

    const found =
      await repository.findByVerifiedContactEmail('ana@example.com');

    expect(findFirst).toHaveBeenCalledExactlyOnceWith({
      where: {
        contactEmail: { equals: 'ana@example.com', mode: 'insensitive' },
        contactEmailVerified: true,
      },
    });
    expect(found?.id).toBe('user-1');
  });

  it('sin una fila verificada con ese correo, devuelve null', async () => {
    const { repository, findFirst } = setup(() => Promise.resolve({}));
    findFirst.mockResolvedValueOnce(null);

    await expect(
      repository.findByVerifiedContactEmail('nadie@example.com'),
    ).resolves.toBeNull();
  });
});

describe('PrismaUserRepository.updatePassword', () => {
  it('reemplaza el hash de la cuenta de credencial de la persona', async () => {
    const { repository, update } = setup(() => Promise.resolve({}));
    update.mockResolvedValueOnce({});

    await repository.updatePassword('user-1', 'hash-nuevo');

    expect(update).toHaveBeenCalledExactlyOnceWith({
      where: {
        providerId_accountId: { providerId: 'credential', accountId: 'user-1' },
      },
      data: { password: 'hash-nuevo' },
    });
  });
});

describe('PrismaUserRepository.findById', () => {
  it('busca por el id y convierte la fila en la entidad', async () => {
    const { repository, findUnique } = setup(() => Promise.resolve({}));
    findUnique.mockResolvedValueOnce({
      id: 'user-1',
      fullName: 'Ana Pérez',
      phone: '+573001234567',
      contactEmail: 'ana@example.com',
      contactEmailVerified: false,
      nationalId: '1020304050',
      mustChangePassword: false,
      createdAt: new Date('2026-09-23T17:00:00Z'),
    });

    const found = await repository.findById('user-1');

    expect(findUnique).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'user-1' },
    });
    expect(found?.id).toBe('user-1');
  });

  it('sin una fila con ese id, devuelve null', async () => {
    const { repository, findUnique } = setup(() => Promise.resolve({}));
    findUnique.mockResolvedValueOnce(null);

    await expect(repository.findById('user-1')).resolves.toBeNull();
  });
});

describe('PrismaUserRepository.markContactEmailVerified', () => {
  it('marca el correo de contacto de la persona como verificado', async () => {
    const { repository, userUpdate } = setup(() => Promise.resolve({}));
    userUpdate.mockResolvedValueOnce({});

    await repository.markContactEmailVerified('user-1');

    expect(userUpdate).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'user-1' },
      data: { contactEmailVerified: true },
    });
  });
});

describe('PrismaUserRepository.updateProfile', () => {
  it('reemplaza el nombre y el correo de contacto de la persona', async () => {
    const { repository, userUpdate } = setup(() => Promise.resolve({}));
    userUpdate.mockResolvedValueOnce({});

    await repository.updateProfile('user-1', {
      fullName: 'Ana Pérez Gómez',
      contactEmail: 'ana@example.com',
      contactEmailVerified: false,
    });

    expect(userUpdate).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'user-1' },
      data: {
        fullName: 'Ana Pérez Gómez',
        contactEmail: 'ana@example.com',
        contactEmailVerified: false,
      },
    });
  });
});

describe('PrismaUserRepository.updateProfile — correo repetido', () => {
  const update = {
    fullName: 'Ana',
    contactEmail: 'ana@example.com',
    contactEmailVerified: false,
  };

  it('traduce la violación de unicidad a ContactEmailAlreadyRegisteredError', async () => {
    const { repository, userUpdate } = setup(() => Promise.resolve({}));
    userUpdate.mockRejectedValueOnce(emailViolation());

    await expect(
      repository.updateProfile('user-1', update),
    ).rejects.toBeInstanceOf(ContactEmailAlreadyRegisteredError);
  });

  it('deja pasar cualquier otro error', async () => {
    const failure = new Error('se cayó la red');
    const { repository, userUpdate } = setup(() => Promise.resolve({}));
    userUpdate.mockRejectedValueOnce(failure);

    await expect(repository.updateProfile('user-1', update)).rejects.toBe(
      failure,
    );
  });
});

describe('PrismaUserRepository.findPasswordHash', () => {
  it('busca la cuenta de credencial de la persona y devuelve su hash', async () => {
    const { repository, accountFindUnique } = setup(() => Promise.resolve({}));
    accountFindUnique.mockResolvedValueOnce({ password: 'hash-guardado' });

    const hash = await repository.findPasswordHash('user-1');

    expect(accountFindUnique).toHaveBeenCalledExactlyOnceWith({
      where: {
        providerId_accountId: { providerId: 'credential', accountId: 'user-1' },
      },
    });
    expect(hash).toBe('hash-guardado');
  });

  it('sin una cuenta de credencial, devuelve null', async () => {
    const { repository, accountFindUnique } = setup(() => Promise.resolve({}));
    accountFindUnique.mockResolvedValueOnce(null);

    await expect(repository.findPasswordHash('user-1')).resolves.toBeNull();
  });
});

describe('PrismaUserRepository.deactivate', () => {
  it('marca cuándo se desactivó la cuenta', async () => {
    const { repository, userUpdate } = setup(() => Promise.resolve({}));
    userUpdate.mockResolvedValueOnce({});
    const deactivatedAt = new Date('2026-09-29T18:00:00Z');

    await repository.deactivate('user-1', deactivatedAt);

    expect(userUpdate).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'user-1' },
      data: { deactivatedAt },
    });
  });
});
