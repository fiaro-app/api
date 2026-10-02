import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it, vi } from 'vitest';
import type { ListNotificationsUseCase } from '@/modules/notifications/application/use-cases/list-notifications.use-case.js';
import type { MarkNotificationReadUseCase } from '@/modules/notifications/application/use-cases/mark-notification-read.use-case.js';
import { NotificationController } from '@/modules/notifications/infrastructure/controllers/notification.controller.js';
import type { AuthenticatedUser } from '@/shared/application/ports/session-resolver.port.js';

const DETAILS = {
  id: 'notification-1',
  recipientUserId: 'user-1',
  lenderId: 'lender-1',
  severity: 'INFO' as const,
  title: 'Préstamo asignado',
  body: 'Te asignaron un préstamo para cobrar.',
  relatedEntityType: 'LOAN' as const,
  relatedEntityId: 'loan-1',
  readAt: null,
  createdAt: new Date('2026-10-02T00:00:00Z'),
};

function setup() {
  const listNotificationsUseCase = {
    execute: vi.fn(() => Promise.resolve({ items: [DETAILS], total: 1 })),
  };
  const markNotificationReadUseCase = {
    execute: vi.fn(() =>
      Promise.resolve({ ...DETAILS, readAt: new Date('2026-10-02T01:00:00Z') }),
    ),
  };
  const controller = new NotificationController(
    listNotificationsUseCase as unknown as ListNotificationsUseCase,
    markNotificationReadUseCase as unknown as MarkNotificationReadUseCase,
  );
  return { controller, listNotificationsUseCase, markNotificationReadUseCase };
}

const USER: AuthenticatedUser = {
  id: 'user-1',
  phone: '+573001234567',
  fullName: 'Ana Prueba',
  mustChangePassword: false,
};

describe('NotificationController', () => {
  it('publica QUERY y POST /:id/read, colgando de /notifications', () => {
    const publishedRoutes = Object.getOwnPropertyNames(
      NotificationController.prototype,
    )
      .flatMap((name) => {
        const handler = Reflect.get(
          NotificationController.prototype,
          name,
        ) as object;
        const method = Reflect.getMetadata(METHOD_METADATA, handler) as
          RequestMethod | undefined;
        return method === undefined ? [] : [RequestMethod[method]];
      })
      .sort();

    expect(publishedRoutes).toEqual(['QUERY', 'POST'].sort());
    expect(Reflect.getMetadata(PATH_METADATA, NotificationController)).toBe(
      'notifications',
    );
  });

  describe('listNotifications', () => {
    it('devuelve la página de notificaciones de quien tiene la sesión', async () => {
      const { controller, listNotificationsUseCase } = setup();

      const response = await controller.listNotifications(
        { page: 1, pageSize: 20 },
        USER,
      );

      expect(listNotificationsUseCase.execute).toHaveBeenCalledExactlyOnceWith({
        recipientUserId: 'user-1',
        page: 1,
        pageSize: 20,
      });
      expect(response.meta).toEqual({ page: 1, pageSize: 20, total: 1 });
      expect(response.data).toHaveLength(1);
    });
  });

  describe('markNotificationRead', () => {
    it('marca como leída la notificación de quien tiene la sesión', async () => {
      const { controller, markNotificationReadUseCase } = setup();

      const response = await controller.markNotificationRead(
        'notification-1',
        USER,
      );

      expect(
        markNotificationReadUseCase.execute,
      ).toHaveBeenCalledExactlyOnceWith('notification-1', 'user-1');
      expect(response.readAt).not.toBeNull();
    });
  });
});
