import { describe, expect, it, vi } from 'vitest';
import { GetUserByPhoneUseCase } from '@/modules/auth/application/use-cases/get-user-by-phone.use-case.js';
import { User } from '@/modules/auth/domain/entities/user.entity.js';
import { InvalidMobilePhoneError } from '@/shared/domain/errors/invalid-mobile-phone.error.js';
import type { UserRepository } from '@/modules/auth/domain/repositories/user.repository.js';
import { MobilePhone } from '@/shared/domain/value-objects/mobile-phone.value-object.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

function setup(found: User | null) {
  const findByPhone = vi.fn(() => Promise.resolve(found));
  const users: UserRepository = {
    create: vi.fn(),
    findByPhone,
    findById: vi.fn(),
    updatePassword: vi.fn(),
    resetToTemporaryPassword: vi.fn(),
    markContactEmailVerified: vi.fn(),
    updateProfile: vi.fn(),
    findPasswordHash: vi.fn(),
    deactivate: vi.fn(),
  };
  return { useCase: new GetUserByPhoneUseCase(users), findByPhone };
}

describe('GetUserByPhoneUseCase', () => {
  it('devuelve los datos públicos de la persona con ese celular', async () => {
    const user = User.create({
      id: 'user-1',
      phone: MobilePhone.parse('+573001234567'),
      fullName: 'Luis Gómez',
      contactEmail: null,
      contactEmailVerified: false,
      nationalId: '1030405060',
      mustChangePassword: false,
      createdAt: CREATED_AT,
    });
    const { useCase, findByPhone } = setup(user);

    const found = await useCase.execute('+573001234567');

    expect(findByPhone).toHaveBeenCalledExactlyOnceWith('+573001234567');
    expect(found?.id).toBe('user-1');
  });

  it('devuelve null si nadie tiene ese celular', async () => {
    const { useCase } = setup(null);

    expect(await useCase.execute('+573001234567')).toBeNull();
  });

  it('rechaza un celular que no está en formato E.164 colombiano', async () => {
    const { useCase } = setup(null);

    await expect(useCase.execute('3001234567')).rejects.toBeInstanceOf(
      InvalidMobilePhoneError,
    );
  });
});
