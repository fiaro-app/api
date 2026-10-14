import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  NotificationRecipient,
  NotificationRecipientReader,
} from '@/modules/auth/application/ports/notification-recipient-reader.port.js';
import type { EmailSender } from '@/modules/notifications/application/ports/email-sender.port.js';
import type { PushSender } from '@/modules/notifications/application/ports/push-sender.port.js';
import { DeliverNotificationUseCase } from '@/modules/notifications/application/use-cases/deliver-notification.use-case.js';
import { Notification } from '@/modules/notifications/domain/entities/notification.entity.js';
import { PushToken } from '@/modules/notifications/domain/entities/push-token.entity.js';
import type { PushTokenRepository } from '@/modules/notifications/domain/repositories/push-token.repository.js';

const NOTIFICATION = Notification.create({
  id: 'notification-1',
  recipientUserId: 'user-1',
  lenderId: 'lender-1',
  severity: 'INFO',
  title: 'Préstamo asignado',
  body: 'Te asignaron un préstamo para cobrar.',
  relatedEntityType: 'LOAN',
  relatedEntityId: 'loan-1',
  readAt: null,
  createdAt: new Date('2026-10-06T00:00:00Z'),
});

const DEVICE = PushToken.create({
  id: 'push-1',
  token: 'ExponentPushToken[dispositivo-1]',
  userId: 'user-1',
  createdAt: new Date('2026-10-06T00:00:00Z'),
  updatedAt: new Date('2026-10-06T00:00:00Z'),
});

function setup(options: {
  recipient: NotificationRecipient | null | Error;
  tokens?: readonly PushToken[];
}) {
  const findRecipientExecute = vi.fn(() =>
    options.recipient instanceof Error
      ? Promise.reject(options.recipient)
      : Promise.resolve(options.recipient),
  );
  const recipients = {
    findRecipient: findRecipientExecute,
  } as unknown as NotificationRecipientReader;

  const sendEmail = vi.fn();
  const emailSender: EmailSender = { send: sendEmail };

  const listByUserExecute = vi.fn(() => Promise.resolve(options.tokens ?? []));
  const pushTokens = {
    listByUser: listByUserExecute,
  } as unknown as PushTokenRepository;

  const sendPush = vi.fn();
  const pushSender: PushSender = { send: sendPush };

  return {
    useCase: new DeliverNotificationUseCase(
      recipients,
      emailSender,
      pushTokens,
      pushSender,
    ),
    findRecipientExecute,
    listByUserExecute,
    sendEmail,
    sendPush,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DeliverNotificationUseCase', () => {
  it('manda el correo verificado y el push a cada dispositivo', async () => {
    const { useCase, findRecipientExecute, sendEmail, sendPush } = setup({
      recipient: { verifiedEmail: 'carlos@example.com' },
      tokens: [DEVICE],
    });

    await useCase.execute(NOTIFICATION);

    expect(findRecipientExecute).toHaveBeenCalledWith('user-1');
    expect(sendEmail).toHaveBeenCalledWith({
      to: 'carlos@example.com',
      subject: 'Fiaro: Préstamo asignado',
      text: 'Préstamo asignado\n\nTe asignaron un préstamo para cobrar.\n\nAbre Fiaro en tu celular para ver los detalles.',
      html: '<p><strong>Préstamo asignado</strong></p><p>Te asignaron un préstamo para cobrar.</p><p>Abre Fiaro en tu celular para ver los detalles.</p>',
    });
    expect(sendPush).toHaveBeenCalledWith([
      {
        to: 'ExponentPushToken[dispositivo-1]',
        title: 'Préstamo asignado',
        body: 'Te asignaron un préstamo para cobrar.',
        data: {
          notificationId: 'notification-1',
          relatedEntityType: 'LOAN',
          relatedEntityId: 'loan-1',
        },
      },
    ]);
  });

  it('sin correo verificado, manda solo el push', async () => {
    const { useCase, sendEmail, sendPush } = setup({
      recipient: { verifiedEmail: null },
      tokens: [DEVICE],
    });

    await useCase.execute(NOTIFICATION);

    expect(sendEmail).not.toHaveBeenCalled();
    expect(sendPush).toHaveBeenCalledTimes(1);
  });

  it('sin dispositivos registrados, manda solo el correo', async () => {
    const { useCase, sendEmail, sendPush } = setup({
      recipient: { verifiedEmail: 'carlos@example.com' },
      tokens: [],
    });

    await useCase.execute(NOTIFICATION);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendPush).not.toHaveBeenCalled();
  });

  it('si auth no encuentra a la persona o está desactivada, no manda nada por ningún canal', async () => {
    const { useCase, listByUserExecute, sendEmail, sendPush } = setup({
      recipient: null,
      tokens: [DEVICE],
    });

    await useCase.execute(NOTIFICATION);

    expect(sendEmail).not.toHaveBeenCalled();
    expect(listByUserExecute).not.toHaveBeenCalled();
    expect(sendPush).not.toHaveBeenCalled();
  });

  it('si falla la búsqueda, lo escribe en el log y no lanza: la notificación ya está guardada', async () => {
    const logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const { useCase, sendEmail, sendPush } = setup({
      recipient: new Error('base de datos caída'),
    });

    await expect(useCase.execute(NOTIFICATION)).resolves.toBeUndefined();

    expect(sendEmail).not.toHaveBeenCalled();
    expect(sendPush).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith(
      'No se pudo entregar la notificación notification-1: Error: base de datos caída.',
    );
  });
});
