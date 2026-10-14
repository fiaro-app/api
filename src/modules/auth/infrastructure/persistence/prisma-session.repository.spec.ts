import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';
import { PrismaSessionRepository } from '@/modules/auth/infrastructure/persistence/prisma-session.repository.js';

function setup(count: number) {
  const deleteMany = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve({ count }),
  );
  const findMany = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve([]),
  );
  const repository = new PrismaSessionRepository({
    session: { deleteMany, findMany },
  } as unknown as PrismaService);
  return { repository, deleteMany, findMany };
}

describe('PrismaSessionRepository.revokeAllForUser', () => {
  it('borra todas las sesiones de la persona y devuelve cuántas cerró', async () => {
    const { repository, deleteMany } = setup(3);

    const closed = await repository.revokeAllForUser('user-1');

    expect(deleteMany).toHaveBeenCalledExactlyOnceWith({
      where: { userId: 'user-1' },
    });
    expect(closed).toBe(3);
  });

  it('sin sesiones abiertas, devuelve 0', async () => {
    const { repository } = setup(0);

    await expect(repository.revokeAllForUser('user-1')).resolves.toBe(0);
  });
});

describe('PrismaSessionRepository.listActiveForUser', () => {
  const NOW = new Date('2026-10-09T12:00:00Z');

  it('trae solo las sesiones de la persona que no han vencido, la usada más recientemente primero, sin el token', async () => {
    const { repository, findMany } = setup(0);
    const row = {
      id: 'session-1',
      ipAddress: '203.0.113.7',
      userAgent: 'Chrome',
      createdAt: new Date('2026-10-01T10:00:00Z'),
      updatedAt: new Date('2026-10-09T10:00:00Z'),
      expiresAt: new Date('2026-11-08T10:00:00Z'),
    };
    findMany.mockResolvedValueOnce([row]);

    const sessions = await repository.listActiveForUser('user-1', NOW);

    expect(findMany).toHaveBeenCalledExactlyOnceWith({
      where: { userId: 'user-1', expiresAt: { gt: NOW } },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
      },
    });
    expect(sessions).toEqual([
      {
        id: 'session-1',
        ipAddress: '203.0.113.7',
        userAgent: 'Chrome',
        createdAt: row.createdAt,
        lastUsedAt: row.updatedAt,
        expiresAt: row.expiresAt,
      },
    ]);
  });

  it('sin sesiones, devuelve una lista vacía', async () => {
    const { repository } = setup(0);

    await expect(repository.listActiveForUser('user-1', NOW)).resolves.toEqual(
      [],
    );
  });
});

describe('PrismaSessionRepository.revokeOne', () => {
  it('borra solo la sesión pedida, acotada a su dueña, y dice que existía', async () => {
    const { repository, deleteMany } = setup(1);

    const revoked = await repository.revokeOne('session-1', 'user-1');

    expect(deleteMany).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'session-1', userId: 'user-1' },
    });
    expect(revoked).toBe(true);
  });

  it('si no había nada que borrar (no existe o es de otra persona), devuelve false', async () => {
    const { repository } = setup(0);

    await expect(repository.revokeOne('session-1', 'user-2')).resolves.toBe(
      false,
    );
  });
});
