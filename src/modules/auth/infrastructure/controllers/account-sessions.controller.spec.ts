import type { Request } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { AccountSession } from '@/modules/auth/application/dtos/account-session.dto.js';
import type { ListAccountSessionsUseCase } from '@/modules/auth/application/use-cases/list-account-sessions.use-case.js';
import type { RevokeAccountSessionUseCase } from '@/modules/auth/application/use-cases/revoke-account-session.use-case.js';
import type { AuthAuditor } from '@/modules/auth/infrastructure/better-auth/auth-auditor.js';
import { AccountController } from '@/modules/auth/infrastructure/controllers/account.controller.js';
import type { AuthenticatedSession } from '@/shared/application/ports/session-resolver.port.js';

const SESSION: AuthenticatedSession = {
  id: 'session-current',
  user: {
    id: 'user-1',
    phone: '+573001234567',
    fullName: 'Ana Pérez',
    mustChangePassword: false,
  },
};

const requestOf = () =>
  ({
    headers: { 'user-agent': 'Chrome' },
    ip: '203.0.113.7',
  }) as unknown as Request;

const SESSIONS: readonly AccountSession[] = [
  {
    id: 'session-current',
    isCurrent: true,
    device: { client: 'Chrome', os: 'Windows', label: 'Chrome en Windows' },
    ipAddress: '203.0.113.7',
    createdAt: new Date('2026-10-01T10:00:00Z'),
    lastUsedAt: new Date('2026-10-09T10:00:00Z'),
    expiresAt: new Date('2026-11-08T10:00:00Z'),
  },
];

function setup() {
  const list = { execute: vi.fn(() => Promise.resolve(SESSIONS)) };
  const revoke = { execute: vi.fn(() => Promise.resolve()) };
  const auditor = { sessionRevoked: vi.fn() };
  const unused = {} as never;
  const controller = new AccountController(
    auditor as unknown as AuthAuditor,
    unused,
    unused,
    unused,
    unused,
    unused,
    list as unknown as ListAccountSessionsUseCase,
    revoke as unknown as RevokeAccountSessionUseCase,
  );
  return { controller, list, revoke, auditor };
}

describe('AccountController.listSessions', () => {
  it('devuelve las sesiones de la persona, marcando la actual, con las fechas en ISO', async () => {
    const { controller, list } = setup();

    const response = await controller.listSessions(SESSION);

    expect(list.execute).toHaveBeenCalledExactlyOnceWith(
      'user-1',
      'session-current',
    );
    expect(response).toEqual([
      {
        id: 'session-current',
        isCurrent: true,
        device: { client: 'Chrome', os: 'Windows', label: 'Chrome en Windows' },
        ipAddress: '203.0.113.7',
        createdAt: '2026-10-01T10:00:00.000Z',
        lastUsedAt: '2026-10-09T10:00:00.000Z',
        expiresAt: '2026-11-08T10:00:00.000Z',
      },
    ]);
  });
});

describe('AccountController.revokeSession', () => {
  it('cierra la sesión pedida y lo audita como una sola sesión cerrada', async () => {
    const { controller, revoke, auditor } = setup();

    await controller.revokeSession('session-old', SESSION, requestOf());

    expect(revoke.execute).toHaveBeenCalledExactlyOnceWith(
      'session-old',
      'user-1',
      'session-current',
    );
    expect(auditor.sessionRevoked).toHaveBeenCalledExactlyOnceWith(
      'user-1',
      'one',
      { ip: '203.0.113.7', userAgent: 'Chrome' },
    );
  });

  it('si el caso de uso falla, no audita nada', async () => {
    const { controller, revoke, auditor } = setup();
    revoke.execute.mockRejectedValueOnce(new Error('no existe'));

    await expect(
      controller.revokeSession('session-old', SESSION, requestOf()),
    ).rejects.toThrow('no existe');
    expect(auditor.sessionRevoked).not.toHaveBeenCalled();
  });
});
