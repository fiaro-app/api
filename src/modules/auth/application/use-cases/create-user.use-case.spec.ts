import { describe, expect, it, vi } from 'vitest';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { InvalidMobilePhoneError } from '@/shared/domain/errors/invalid-mobile-phone.error.js';
import type { User } from '@/modules/auth/domain/entities/user.entity.js';
import { InvalidPasswordError } from '@/modules/auth/domain/errors/invalid-password.error.js';
import { InvalidUserDataError } from '@/modules/auth/domain/errors/invalid-user-data.error.js';
import { PhoneAlreadyRegisteredError } from '@/modules/auth/domain/errors/phone-already-registered.error.js';
import { WeakPasswordError } from '@/modules/auth/domain/errors/weak-password.error.js';
import type { UserRepository } from '@/modules/auth/domain/repositories/user.repository.js';
import type { PasswordHasher } from '@/modules/auth/application/ports/password-hasher.port.js';
import { CreateUserUseCase } from '@/modules/auth/application/use-cases/create-user.use-case.js';

const NOW = new Date('2026-09-23T17:00:00Z');
const VALID = {
  phone: '+573001234567',
  fullName: 'Ana Pérez',
  password: 'una-contraseña-larga',
};

function setup(options: { repositoryError?: Error } = {}) {
  const saved: { user: User; passwordHash: string }[] = [];
  const create = vi.fn((user: User, passwordHash: string) => {
    if (options.repositoryError) {
      return Promise.reject(options.repositoryError);
    }
    saved.push({ user, passwordHash });
    return Promise.resolve();
  });
  const hash = vi.fn((password: string) =>
    Promise.resolve(`hash(${password})`),
  );
  const users: UserRepository = {
    create,
    findByPhone: vi.fn(() => Promise.resolve(null)),
    findById: vi.fn(() => Promise.resolve(null)),
    updatePassword: vi.fn(() => Promise.resolve()),
    markContactEmailVerified: vi.fn(() => Promise.resolve()),
  };
  const passwordHasher: PasswordHasher = { hash };
  const ids: IdGenerator = { next: () => 'id-1' };
  const clock: Clock = { now: () => NOW };
  return {
    useCase: new CreateUserUseCase(users, passwordHasher, ids, clock),
    create,
    hash,
    saved,
  };
}

describe('CreateUserUseCase', () => {
  it('crea la persona con su identificador, la hora del reloj y solo el hash de la contraseña', async () => {
    const { useCase, saved } = setup();

    const created = await useCase.execute(VALID);

    expect(created).toEqual({
      id: 'id-1',
      phone: '+573001234567',
      fullName: 'Ana Pérez',
      contactEmail: null,
      contactEmailVerified: false,
      nationalId: null,
      mustChangePassword: false,
      createdAt: NOW,
    });
    expect(saved).toHaveLength(1);
    expect(saved[0]?.passwordHash).toBe('hash(una-contraseña-larga)');
    expect(JSON.stringify(saved[0]?.user)).not.toContain(
      'una-contraseña-larga',
    );
  });

  it('guarda el email real y la cédula cuando llegan, y recorta el nombre', async () => {
    const { useCase } = setup();

    const created = await useCase.execute({
      ...VALID,
      fullName: '  Ana Pérez  ',
      contactEmail: 'ana@example.com',
      nationalId: '1020304050',
    });

    expect(created).toMatchObject({
      fullName: 'Ana Pérez',
      contactEmail: 'ana@example.com',
      nationalId: '1020304050',
    });
  });

  it('marca la contraseña como temporal cuando se pide', async () => {
    const { useCase, saved } = setup();

    const created = await useCase.execute({
      ...VALID,
      mustChangePassword: true,
    });

    expect(created.mustChangePassword).toBe(true);
    expect(saved[0]?.user.mustChangePassword).toBe(true);
  });

  it.each([
    ['sin el indicativo', '3001234567'],
    ['de un fijo', '+576012345678'],
    ['con espacios', '+57 300 123 4567'],
  ])('rechaza un celular %s sin guardar nada', async (_caso, phone) => {
    const { useCase, create, hash } = setup();

    await expect(useCase.execute({ ...VALID, phone })).rejects.toBeInstanceOf(
      InvalidMobilePhoneError,
    );
    expect(create).not.toHaveBeenCalled();
    expect(hash).not.toHaveBeenCalled();
  });

  it.each([
    ['un nombre demasiado corto', { fullName: 'A' }, 'fullName'],
    ['una cédula con puntos', { nationalId: '1.020.304.050' }, 'nationalId'],
    ['un email mal escrito', { contactEmail: 'ana@' }, 'email'],
  ])('rechaza %s e indica el campo', async (_caso, change, field) => {
    const { useCase, create } = setup();

    const error = await useCase
      .execute({ ...VALID, ...change })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(InvalidUserDataError);
    expect((error as InvalidUserDataError).issues[0]?.path).toEqual([field]);
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    ['corta', 'abc1234'],
    ['larga', 'a'.repeat(129)],
  ])(
    'rechaza una contraseña %s antes de calcular el hash',
    async (_caso, password) => {
      const { useCase, hash } = setup();

      await expect(
        useCase.execute({ ...VALID, password }),
      ).rejects.toBeInstanceOf(InvalidPasswordError);
      expect(hash).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['una de las más usadas', { password: 'password123' }],
    ['un patrón', { password: 'abcdefghij' }],
    ['una que lleva el celular', { password: 'ana-3001234567-x' }],
    [
      'una que lleva la cédula',
      { password: 'mi-cedula-1020304050', nationalId: '1020304050' },
    ],
  ])(
    'rechaza una contraseña demasiado fácil de adivinar (%s) antes de calcular el hash',
    async (_caso, change) => {
      const { useCase, create, hash } = setup();

      await expect(
        useCase.execute({ ...VALID, ...change }),
      ).rejects.toBeInstanceOf(WeakPasswordError);
      expect(hash).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
    },
  );

  it('deja pasar el error del repositorio cuando el celular ya tiene cuenta', async () => {
    const { useCase } = setup({
      repositoryError: new PhoneAlreadyRegisteredError(),
    });

    await expect(useCase.execute(VALID)).rejects.toBeInstanceOf(
      PhoneAlreadyRegisteredError,
    );
  });
});
