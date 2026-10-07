import { describe, expect, it, vi } from 'vitest';
import { PushToken } from '@/modules/notifications/domain/entities/push-token.entity.js';
import { PrismaPushTokenRepository } from '@/modules/notifications/infrastructure/persistence/prisma-push-token.repository.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

const DATE = new Date('2026-10-06T12:00:00Z');

const PUSH_TOKEN = PushToken.create({
  id: 'push-1',
  token: 'ExponentPushToken[dispositivo-1]',
  userId: 'user-1',
  createdAt: DATE,
  updatedAt: DATE,
});

function setup() {
  const upsert = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve({}),
  );
  const findMany = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve([
      {
        id: 'push-1',
        token: 'ExponentPushToken[dispositivo-1]',
        userId: 'user-1',
        createdAt: DATE,
        updatedAt: DATE,
      },
    ]),
  );
  const deleteMany = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve({ count: 1 }),
  );
  const repository = new PrismaPushTokenRepository({
    pushToken: { upsert, findMany, deleteMany },
  } as unknown as PrismaService);
  return { repository, upsert, findMany, deleteMany };
}

describe('PrismaPushTokenRepository', () => {
  it('registra el token, y si ya existía solo lo reasigna y actualiza su fecha', async () => {
    const { repository, upsert } = setup();

    await repository.upsert(PUSH_TOKEN);

    expect(upsert).toHaveBeenCalledWith({
      where: { token: 'ExponentPushToken[dispositivo-1]' },
      create: {
        id: 'push-1',
        token: 'ExponentPushToken[dispositivo-1]',
        userId: 'user-1',
        createdAt: DATE,
        updatedAt: DATE,
      },
      update: { userId: 'user-1', updatedAt: DATE },
    });
  });

  it('lista los tokens de una persona, del primero registrado al último', async () => {
    const { repository, findMany } = setup();

    const tokens = await repository.listByUser('user-1');

    expect(findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'asc' },
    });
    expect(tokens).toEqual([PUSH_TOKEN]);
  });

  it('quita un token solo si es de esa persona', async () => {
    const { repository, deleteMany } = setup();

    await repository.deleteForUser(
      'user-1',
      'ExponentPushToken[dispositivo-1]',
    );

    expect(deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', token: 'ExponentPushToken[dispositivo-1]' },
    });
  });

  it('quita un token sin importar de quién es', async () => {
    const { repository, deleteMany } = setup();

    await repository.deleteByToken('ExponentPushToken[dispositivo-1]');

    expect(deleteMany).toHaveBeenCalledWith({
      where: { token: 'ExponentPushToken[dispositivo-1]' },
    });
  });
});
