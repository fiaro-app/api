import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LeadNotificationSettings } from '@/modules/leads/application/ports/lead-notification-settings.port.js';
import { LeadNotifier } from '@/modules/leads/application/services/lead-notifier.js';
import { Lead } from '@/modules/leads/domain/entities/lead.entity.js';

const LEAD = Lead.create({
  id: 'lead-1',
  name: 'Ana Pérez',
  phone: '+573001234567',
  email: null,
  message: 'Quiero probar Fiaro.',
  createdAt: new Date('2026-10-09T12:00:00Z'),
});

function setup(recipient: string | undefined) {
  const send = vi.fn();
  const settings: LeadNotificationSettings = {
    recipientEmail: () => recipient,
  };
  const notifier = new LeadNotifier(settings, { send });
  return { notifier, send };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LeadNotifier', () => {
  it('manda a ventas el correo con los datos del contacto', () => {
    const { notifier, send } = setup('ventas@fiaro.co');

    notifier.notify(LEAD);

    expect(send).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        to: 'ventas@fiaro.co',
        subject: 'Nuevo contacto de ventas: Ana Pérez',
      }),
    );
  });

  it('sin correo de ventas configurado no manda nada y lo deja dicho en el log', () => {
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const { notifier, send } = setup(undefined);

    notifier.notify(LEAD);

    expect(send).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('lead-1'));
  });
});
