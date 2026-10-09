import { describe, expect, it } from 'vitest';
import type { Env } from '@/config/env.js';
import { EnvLeadNotificationSettings } from '@/modules/leads/infrastructure/settings/env-lead-notification-settings.js';

const settingsWith = (notifyEmail: string | undefined) =>
  new EnvLeadNotificationSettings({ leads: { notifyEmail } } as Env);

describe('EnvLeadNotificationSettings', () => {
  it('devuelve el correo de ventas configurado', () => {
    expect(settingsWith('ventas@fiaro.co').recipientEmail()).toBe(
      'ventas@fiaro.co',
    );
  });

  it('sin configurar, devuelve undefined', () => {
    expect(settingsWith(undefined).recipientEmail()).toBeUndefined();
  });
});
