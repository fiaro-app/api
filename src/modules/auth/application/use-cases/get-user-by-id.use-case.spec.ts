import { describe, expect, it, vi } from 'vitest';
import { GetUserByIdUseCase } from '@/modules/auth/application/use-cases/get-user-by-id.use-case.js';
import { User } from '@/modules/auth/domain/entities/user.entity.js';
import type { UserRepository } from '@/modules/auth/domain/repositories/user.repository.js';
import { MobilePhone } from '@/shared/domain/value-objects/mobile-phone.value-object.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

function setup(found: User | null) {
  const findById = vi.fn(() => Promise.resolve(found));
  const users: UserRepository = {
    create: vi.fn(),
    findByPhone: vi.fn(),
    findById,
    updatePassword: vi.fn(),
    markContactEmailVerified: vi.fn(),
    updateProfile: vi.fn(),
    findPasswordHash: vi.fn(),
    deactivate: vi.fn(),
  };
  return { useCase: new GetUserByIdUseCase(users), findById };
}

describe('GetUserByIdUseCase', () => {
  it('devuelve los datos públicos de la persona con ese id', async () => {
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
    const { useCase, findById } = setup(user);

    const found = await useCase.execute('user-1');

    expect(findById).toHaveBeenCalledExactlyOnceWith('user-1');
    expect(found?.fullName).toBe('Luis Gómez');
  });

  it('devuelve null si no existe', async () => {
    const { useCase } = setup(null);

    expect(await useCase.execute('user-1')).toBeNull();
  });
});
