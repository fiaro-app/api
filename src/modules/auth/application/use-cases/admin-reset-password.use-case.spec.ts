import { describe, expect, it, vi } from 'vitest';
import { AdminResetPasswordUseCase } from '@/modules/auth/application/use-cases/admin-reset-password.use-case.js';
import type { PasswordHasher } from '@/modules/auth/application/ports/password-hasher.port.js';
import type { SessionRepository } from '@/modules/auth/domain/repositories/session.repository.js';
import type { UserRepository } from '@/modules/auth/domain/repositories/user.repository.js';
import type { TempPasswordGenerator } from '@/shared/application/ports/temp-password-generator.port.js';

function setup() {
  const resetToTemporaryPassword = vi.fn(() => Promise.resolve());
  const users: UserRepository = {
    create: vi.fn(),
    findByPhone: vi.fn(),
    findById: vi.fn(),
    updatePassword: vi.fn(),
    resetToTemporaryPassword,
    markContactEmailVerified: vi.fn(),
    updateProfile: vi.fn(),
    findPasswordHash: vi.fn(),
    deactivate: vi.fn(),
  };
  const hash = vi.fn(() => Promise.resolve('hash-de-la-temporal'));
  const passwordHasher: PasswordHasher = { hash, verify: vi.fn() };
  const tempPasswords: TempPasswordGenerator = {
    next: vi.fn(() => 'TempAbc23456'),
  };
  const revokeAllForUser = vi.fn(() => Promise.resolve(1));
  const sessions: SessionRepository = { revokeAllForUser };
  return {
    useCase: new AdminResetPasswordUseCase(
      users,
      passwordHasher,
      tempPasswords,
      sessions,
    ),
    resetToTemporaryPassword,
    hash,
    revokeAllForUser,
  };
}

describe('AdminResetPasswordUseCase', () => {
  it('genera una contraseña temporal, la guarda hasheada y revoca las sesiones', async () => {
    const { useCase, resetToTemporaryPassword, hash, revokeAllForUser } =
      setup();

    const tempPassword = await useCase.execute('user-1');

    expect(tempPassword).toBe('TempAbc23456');
    expect(hash).toHaveBeenCalledExactlyOnceWith('TempAbc23456');
    expect(resetToTemporaryPassword).toHaveBeenCalledExactlyOnceWith(
      'user-1',
      'hash-de-la-temporal',
    );
    expect(revokeAllForUser).toHaveBeenCalledExactlyOnceWith('user-1');
  });
});
