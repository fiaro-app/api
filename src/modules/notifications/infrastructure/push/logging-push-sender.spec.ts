import { describe, expect, it, vi } from 'vitest';
import type { PushMessage } from '@/modules/notifications/domain/push-message.js';
import { LoggingPushSender } from '@/modules/notifications/infrastructure/push/logging-push-sender.js';

const MESSAGE: PushMessage = {
  to: 'ExponentPushToken[dispositivo-1]',
  title: 'Préstamo asignado',
  body: 'Te asignaron un préstamo para cobrar.',
  data: {
    notificationId: 'notification-1',
    relatedEntityType: 'LOAN',
    relatedEntityId: 'loan-1',
  },
};

describe('LoggingPushSender', () => {
  it('escribe cada push en el log con su notificación, sin el token del dispositivo', () => {
    const logger = { log: vi.fn() };
    const sender = new LoggingPushSender(logger);

    sender.send([
      MESSAGE,
      {
        ...MESSAGE,
        data: { ...MESSAGE.data, notificationId: 'notification-2' },
      },
    ]);

    expect(logger.log).toHaveBeenCalledTimes(2);
    expect(logger.log).toHaveBeenCalledWith(
      'Push (modo desarrollo, no se envía) para la notificación notification-1 — título: "Préstamo asignado".',
    );
    expect(logger.log.mock.calls.flat().join(' ')).not.toContain(
      'ExponentPushToken',
    );
  });
});
