import { describe, expect, it, vi } from 'vitest';
import { Notification } from '@/modules/notifications/domain/entities/notification.entity.js';
import { PrismaNotificationRepository } from '@/modules/notifications/infrastructure/persistence/prisma-notification.repository.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

const CREATED_AT = new Date('2026-10-02T00:00:00Z');

const notification = Notification.create({
  id: 'notification-1',
  recipientUserId: 'user-1',
  lenderId: 'lender-1',
  severity: 'INFO',
  title: 'Préstamo asignado',
  body: 'Te asignaron un préstamo para cobrar.',
  relatedEntityType: 'LOAN',
  relatedEntityId: 'loan-1',
  readAt: null,
  createdAt: CREATED_AT,
});

const row = {
  id: 'notification-1',
  recipientUserId: 'user-1',
  lenderId: 'lender-1',
  severity: 'INFO' as const,
  title: 'Préstamo asignado',
  body: 'Te asignaron un préstamo para cobrar.',
  relatedEntityType: 'LOAN' as const,
  relatedEntityId: 'loan-1',
  readAt: null,
  createdAt: CREATED_AT,
};

function setup() {
  const create = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve(),
  );
  const findFirst = vi.fn<(args: unknown) => Promise<unknown>>();
  const findMany = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve([]),
  );
  const count = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve(0),
  );
  const update = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve(row),
  );
  const updateMany = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve({ count: 0 }),
  );
  const $transaction = vi.fn((operations: Promise<unknown>[]) =>
    Promise.all(operations),
  );
  const repository = new PrismaNotificationRepository({
    notification: { create, findFirst, findMany, count, update, updateMany },
    $transaction,
  } as unknown as PrismaService);
  return {
    repository,
    create,
    findFirst,
    findMany,
    count,
    update,
    updateMany,
  };
}

describe('PrismaNotificationRepository.create', () => {
  it('guarda la notificación nueva', async () => {
    const { repository, create } = setup();

    await repository.create(notification);

    expect(create).toHaveBeenCalledExactlyOnceWith({
      data: {
        id: 'notification-1',
        recipientUserId: 'user-1',
        lenderId: 'lender-1',
        severity: 'INFO',
        title: 'Préstamo asignado',
        body: 'Te asignaron un préstamo para cobrar.',
        relatedEntityType: 'LOAN',
        relatedEntityId: 'loan-1',
        readAt: null,
        createdAt: CREATED_AT,
      },
    });
  });
});

describe('PrismaNotificationRepository.findById', () => {
  it('devuelve la notificación si existe para quien la recibe', async () => {
    const { repository, findFirst } = setup();
    findFirst.mockResolvedValueOnce(row);

    const found = await repository.findById('notification-1', 'user-1');

    expect(findFirst).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'notification-1', recipientUserId: 'user-1' },
    });
    expect(found).toEqual(notification);
  });

  it('devuelve null si no existe, o no es de esa persona', async () => {
    const { repository, findFirst } = setup();
    findFirst.mockResolvedValueOnce(null);

    await expect(
      repository.findById('notification-1', 'user-1'),
    ).resolves.toBeNull();
  });
});

describe('PrismaNotificationRepository.list', () => {
  it('pagina sin filtros, de la más nueva a la más antigua', async () => {
    const { repository, findMany, count } = setup();
    findMany.mockResolvedValueOnce([row]);
    count.mockResolvedValueOnce(1);

    const page = await repository.list({
      recipientUserId: 'user-1',
      page: 2,
      pageSize: 10,
    });

    const expectedWhere = { recipientUserId: 'user-1' };
    expect(findMany).toHaveBeenCalledExactlyOnceWith({
      where: expectedWhere,
      orderBy: { createdAt: 'desc' },
      skip: 10,
      take: 10,
    });
    expect(count).toHaveBeenCalledExactlyOnceWith({ where: expectedWhere });
    expect(page).toEqual({ items: [notification], total: 1 });
  });

  it('agrega el filtro por prestamista y por sin leer cuando llegan', async () => {
    const { repository, findMany, count } = setup();

    await repository.list({
      recipientUserId: 'user-1',
      page: 1,
      pageSize: 20,
      lenderId: 'lender-1',
      unreadOnly: true,
    });

    const expectedWhere = {
      recipientUserId: 'user-1',
      lenderId: 'lender-1',
      readAt: null,
    };
    expect(findMany).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ where: expectedWhere }),
    );
    expect(count).toHaveBeenCalledExactlyOnceWith({ where: expectedWhere });
  });
});

describe('PrismaNotificationRepository.markAsRead', () => {
  it('guarda cuándo se leyó', async () => {
    const { repository, update } = setup();
    const readAt = new Date('2026-10-02T01:00:00Z');
    update.mockResolvedValueOnce({ ...row, readAt });

    const read = await repository.markAsRead('notification-1', readAt);

    expect(update).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'notification-1' },
      data: { readAt },
    });
    expect(read.readAt).toEqual(readAt);
  });
});

describe('PrismaNotificationRepository.countUnread', () => {
  it('cuenta solo las sin leer de esa persona', async () => {
    const { repository, count } = setup();
    count.mockResolvedValueOnce(3);

    const unread = await repository.countUnread({ recipientUserId: 'user-1' });

    expect(unread).toBe(3);
    expect(count).toHaveBeenCalledExactlyOnceWith({
      where: { recipientUserId: 'user-1', readAt: null },
    });
  });

  it('agrega el filtro por prestamista cuando llega', async () => {
    const { repository, count } = setup();

    await repository.countUnread({
      recipientUserId: 'user-1',
      lenderId: 'lender-1',
    });

    expect(count).toHaveBeenCalledExactlyOnceWith({
      where: { recipientUserId: 'user-1', lenderId: 'lender-1', readAt: null },
    });
  });
});

describe('PrismaNotificationRepository.markAllAsRead', () => {
  it('actualiza solo las sin leer, en una sola operación, y devuelve cuántas', async () => {
    const { repository, updateMany } = setup();
    updateMany.mockResolvedValueOnce({ count: 4 });

    const marked = await repository.markAllAsRead(
      { recipientUserId: 'user-1' },
      CREATED_AT,
    );

    expect(marked).toBe(4);
    expect(updateMany).toHaveBeenCalledExactlyOnceWith({
      where: { recipientUserId: 'user-1', readAt: null },
      data: { readAt: CREATED_AT },
    });
  });

  it('agrega el filtro por prestamista cuando llega', async () => {
    const { repository, updateMany } = setup();

    await repository.markAllAsRead(
      { recipientUserId: 'user-1', lenderId: 'lender-1' },
      CREATED_AT,
    );

    expect(updateMany).toHaveBeenCalledExactlyOnceWith({
      where: { recipientUserId: 'user-1', lenderId: 'lender-1', readAt: null },
      data: { readAt: CREATED_AT },
    });
  });
});
