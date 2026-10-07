import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NotificationEmailReader } from '@/modules/auth/application/ports/notification-email-reader.port.js';
import type { EmailSender } from '@/modules/notifications/application/ports/email-sender.port.js';
import { DeliverNotificationUseCase } from '@/modules/notifications/application/use-cases/deliver-notification.use-case.js';
import { Notification } from '@/modules/notifications/domain/entities/notification.entity.js';

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

function setup(lookup: () => Promise<string | null>) {
  const findVerifiedContactEmailExecute = vi.fn(lookup);
  const emailReader = {
    findVerifiedContactEmail: findVerifiedContactEmailExecute,
  } as unknown as NotificationEmailReader;

  const send = vi.fn();
  const emailSender: EmailSender = { send };

  return {
    useCase: new DeliverNotificationUseCase(emailReader, emailSender),
    findVerifiedContactEmailExecute,
    send,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DeliverNotificationUseCase', () => {
  it('manda el correo al correo verificado de quien la recibe', async () => {
    const { useCase, findVerifiedContactEmailExecute, send } = setup(() =>
      Promise.resolve('carlos@example.com'),
    );

    await useCase.execute(NOTIFICATION);

    expect(findVerifiedContactEmailExecute).toHaveBeenCalledWith('user-1');
    expect(send).toHaveBeenCalledWith({
      to: 'carlos@example.com',
      subject: 'Fiaro: Préstamo asignado',
      text: 'Préstamo asignado\n\nTe asignaron un préstamo para cobrar.\n\nAbre Fiaro en tu celular para ver los detalles.',
      html: '<p><strong>Préstamo asignado</strong></p><p>Te asignaron un préstamo para cobrar.</p><p>Abre Fiaro en tu celular para ver los detalles.</p>',
    });
  });

  it('no manda nada si auth no tiene un correo verificado y activo para esa persona', async () => {
    const { useCase, send } = setup(() => Promise.resolve(null));

    await useCase.execute(NOTIFICATION);

    expect(send).not.toHaveBeenCalled();
  });

  it('si falla la búsqueda, lo escribe en el log y no lanza: la notificación ya está guardada', async () => {
    const logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const { useCase, send } = setup(() =>
      Promise.reject(new Error('base de datos caída')),
    );

    await expect(useCase.execute(NOTIFICATION)).resolves.toBeUndefined();

    expect(send).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith(
      'No se pudo entregar la notificación notification-1: Error: base de datos caída.',
    );
  });
});
