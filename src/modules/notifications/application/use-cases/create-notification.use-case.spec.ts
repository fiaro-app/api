import { describe, expect, it, vi } from 'vitest';
import type { DeliverNotificationUseCase } from '@/modules/notifications/application/use-cases/deliver-notification.use-case.js';
import { CreateNotificationUseCase } from '@/modules/notifications/application/use-cases/create-notification.use-case.js';
import type { Notification } from '@/modules/notifications/domain/entities/notification.entity.js';
import type { NotificationRepository } from '@/modules/notifications/domain/repositories/notification.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';

const NOW = new Date('2026-10-02T00:00:00Z');

function setup() {
  const saved: Notification[] = [];
  const order: string[] = [];
  const create = vi.fn((notification: Notification) => {
    saved.push(notification);
    order.push('save');
    return Promise.resolve();
  });
  const notifications: NotificationRepository = {
    create,
    findById: vi.fn(() => Promise.resolve(null)),
    list: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
    markAsRead: vi.fn(() => Promise.reject(new Error('no usado'))),
    countUnread: vi.fn(() => Promise.reject(new Error('no usado'))),
    markAllAsRead: vi.fn(() => Promise.reject(new Error('no usado'))),
  };
  const ids: IdGenerator = { next: () => 'notification-1' };
  const clock: Clock = { now: () => NOW };
  const deliverExecute = vi.fn(() => {
    order.push('deliver');
    return Promise.resolve();
  });
  const deliver = {
    execute: deliverExecute,
  } as unknown as DeliverNotificationUseCase;
  return {
    useCase: new CreateNotificationUseCase(notifications, ids, clock, deliver),
    saved,
    order,
    deliverExecute,
  };
}

describe('CreateNotificationUseCase', () => {
  it('crea la notificación sin leer, con la entidad relacionada', async () => {
    const { useCase, saved } = setup();

    const created = await useCase.execute({
      recipientUserId: 'user-1',
      lenderId: 'lender-1',
      severity: 'INFO',
      title: 'Préstamo asignado',
      body: 'Te asignaron un préstamo para cobrar.',
      relatedEntityType: 'LOAN',
      relatedEntityId: 'loan-1',
    });

    expect(saved).toHaveLength(1);
    expect(created).toEqual({
      id: 'notification-1',
      recipientUserId: 'user-1',
      lenderId: 'lender-1',
      severity: 'INFO',
      title: 'Préstamo asignado',
      body: 'Te asignaron un préstamo para cobrar.',
      relatedEntityType: 'LOAN',
      relatedEntityId: 'loan-1',
      readAt: null,
      createdAt: NOW,
    });
  });

  it('sin entidad relacionada, guarda ambos campos en null', async () => {
    const { useCase, saved } = setup();

    await useCase.execute({
      recipientUserId: 'user-1',
      lenderId: 'lender-1',
      severity: 'ALERT',
      title: 'Aviso',
      body: 'Texto.',
      relatedEntityType: null,
      relatedEntityId: null,
    });

    expect(saved[0]?.relatedEntityType).toBeNull();
    expect(saved[0]?.relatedEntityId).toBeNull();
  });

  it('entrega la notificación recién guardada, después de guardarla', async () => {
    const { useCase, saved, order, deliverExecute } = setup();

    await useCase.execute({
      recipientUserId: 'user-1',
      lenderId: 'lender-1',
      severity: 'INFO',
      title: 'Cuadre por revisar',
      body: 'Un cobrador cerró su día.',
      relatedEntityType: 'DAILY_SETTLEMENT',
      relatedEntityId: 'settlement-1',
    });

    expect(order).toEqual(['save', 'deliver']);
    expect(deliverExecute).toHaveBeenCalledWith(saved[0]);
  });
});
