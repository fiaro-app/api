import { describe, expect, it } from 'vitest';
import { loadEnv } from '@/config/env.js';
import { REQUIRED_ENV } from '@test/support/required-env.js';

const load = (source: NodeJS.ProcessEnv = {}) =>
  loadEnv({ ...REQUIRED_ENV, ...source });

describe('retención de notificaciones (D-142)', () => {
  it('por defecto conserva 90 días', () => {
    expect(load().notificationRetention.days).toBe(90);
  });

  it('en las pruebas no borra nada, para no tocar datos de otros casos', () => {
    expect(load({ NODE_ENV: 'test' }).notificationRetention.days).toBe(0);
  });

  it('NOTIFICATION_RETENTION_DAYS decide cuando viene; 0 apaga el borrado', () => {
    expect(
      load({ NOTIFICATION_RETENTION_DAYS: '30' }).notificationRetention.days,
    ).toBe(30);
    expect(
      load({ NOTIFICATION_RETENTION_DAYS: '0' }).notificationRetention.days,
    ).toBe(0);
  });

  it('rechaza un valor que no sea un entero entre 0 y 3650', () => {
    expect(() => load({ NOTIFICATION_RETENTION_DAYS: 'mucho' })).toThrow(
      /NOTIFICATION_RETENTION_DAYS/,
    );
    expect(() => load({ NOTIFICATION_RETENTION_DAYS: '-1' })).toThrow(
      /NOTIFICATION_RETENTION_DAYS/,
    );
  });
});
