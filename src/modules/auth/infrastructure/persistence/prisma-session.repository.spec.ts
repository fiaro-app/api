import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';
import { PrismaSessionRepository } from '@/modules/auth/infrastructure/persistence/prisma-session.repository.js';

function setup(count: number) {
  const deleteMany = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve({ count }),
  );
  const repository = new PrismaSessionRepository({
    session: { deleteMany },
  } as unknown as PrismaService);
  return { repository, deleteMany };
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
