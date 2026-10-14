import { describe, expect, it, vi } from 'vitest';
import { RevokeAccountSessionUseCase } from '@/modules/auth/application/use-cases/revoke-account-session.use-case.js';
import { CurrentSessionNotRevocableError } from '@/modules/auth/domain/errors/current-session-not-revocable.error.js';
import { SessionNotFoundError } from '@/modules/auth/domain/errors/session-not-found.error.js';
import type { SessionRepository } from '@/modules/auth/domain/repositories/session.repository.js';

function setup(revoked: boolean) {
  const revokeOne = vi.fn(() => Promise.resolve(revoked));
  const repository: SessionRepository = {
    revokeAllForUser: vi.fn(),
    listActiveForUser: vi.fn(),
    revokeOne,
  };
  return { useCase: new RevokeAccountSessionUseCase(repository), revokeOne };
}

describe('RevokeAccountSessionUseCase', () => {
  it('cierra la sesión pedida, acotada a la persona', async () => {
    const { useCase, revokeOne } = setup(true);

    await useCase.execute('session-old', 'user-1', 'session-current');

    expect(revokeOne).toHaveBeenCalledExactlyOnceWith('session-old', 'user-1');
  });

  it('no cierra la sesión actual: para eso está sign-out', async () => {
    const { useCase, revokeOne } = setup(true);

    await expect(
      useCase.execute('session-current', 'user-1', 'session-current'),
    ).rejects.toBeInstanceOf(CurrentSessionNotRevocableError);
    expect(revokeOne).not.toHaveBeenCalled();
  });

  it('lanza SessionNotFoundError si no existe, ya venció o es de otra persona', async () => {
    const { useCase } = setup(false);

    await expect(
      useCase.execute('session-old', 'user-1', 'session-current'),
    ).rejects.toBeInstanceOf(SessionNotFoundError);
  });
});
