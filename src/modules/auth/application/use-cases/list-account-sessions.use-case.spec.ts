import { describe, expect, it, vi } from 'vitest';
import { ListAccountSessionsUseCase } from '@/modules/auth/application/use-cases/list-account-sessions.use-case.js';
import type {
  ActiveSession,
  SessionRepository,
} from '@/modules/auth/domain/repositories/session.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';

const NOW = new Date('2026-10-09T12:00:00Z');

const session = (id: string, userAgent: string | null): ActiveSession => ({
  id,
  ipAddress: '203.0.113.7',
  userAgent,
  createdAt: new Date('2026-10-01T10:00:00Z'),
  lastUsedAt: new Date('2026-10-09T10:00:00Z'),
  expiresAt: new Date('2026-11-08T10:00:00Z'),
});

function setup(sessions: readonly ActiveSession[]) {
  const listActiveForUser = vi.fn(() => Promise.resolve(sessions));
  const repository: SessionRepository = {
    revokeAllForUser: vi.fn(),
    listActiveForUser,
    revokeOne: vi.fn(),
  };
  const clock: Clock = { now: () => NOW };
  return {
    useCase: new ListAccountSessionsUseCase(repository, clock),
    listActiveForUser,
  };
}

describe('ListAccountSessionsUseCase', () => {
  it('pide al repositorio las sesiones vigentes a esta hora', async () => {
    const { useCase, listActiveForUser } = setup([]);

    await useCase.execute('user-1', 'session-1');

    expect(listActiveForUser).toHaveBeenCalledExactlyOnceWith('user-1', NOW);
  });

  it('marca como actual solo la sesión desde la que se consulta', async () => {
    const { useCase } = setup([
      session('session-1', null),
      session('session-2', null),
    ]);

    const result = await useCase.execute('user-1', 'session-2');

    expect(result.map((s) => [s.id, s.isCurrent])).toEqual([
      ['session-1', false],
      ['session-2', true],
    ]);
  });

  it('describe el dispositivo de cada sesión a partir de su User-Agent', async () => {
    const { useCase } = setup([
      session(
        'session-1',
        'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/126.0 Safari/537.36',
      ),
      session('session-2', null),
    ]);

    const result = await useCase.execute('user-1', 'session-1');

    expect(result[0]?.device.label).toBe('Chrome en Windows');
    expect(result[1]?.device.label).toBe('Dispositivo desconocido');
  });
});
