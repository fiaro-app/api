import { describe, expect, it } from 'vitest';
import { loadEnv } from '@/config/env.js';
import { PRODUCTION_ENV, REQUIRED_ENV } from '@test/support/required-env.js';

const load = (source: NodeJS.ProcessEnv = {}) =>
  loadEnv({ ...REQUIRED_ENV, ...source });

const PRODUCTION = {
  ...PRODUCTION_ENV,
  NODE_ENV: 'production',
  TRUST_PROXY: '1',
};

describe('envío de notificaciones push (D-95)', () => {
  it('fuera de producción, solo las escribe en el log', () => {
    expect(load().push.delivery).toBe('log');
    expect(load({ NODE_ENV: 'test' }).push.delivery).toBe('log');
  });

  it('en producción, las manda con Expo sin configurar nada más', () => {
    expect(load(PRODUCTION).push.delivery).toBe('expo');
  });

  it('PUSH_DELIVERY decide el modo cuando viene, en cualquier entorno', () => {
    expect(load({ ...PRODUCTION, PUSH_DELIVERY: 'log' }).push.delivery).toBe(
      'log',
    );
    expect(load({ PUSH_DELIVERY: 'expo' }).push.delivery).toBe('expo');
  });

  it('rechaza un PUSH_DELIVERY que no sea expo ni log', () => {
    expect(() => load({ PUSH_DELIVERY: 'fcm' })).toThrow(/PUSH_DELIVERY/);
  });

  it('pasa el token de acceso de Expo tal cual, si hay uno', () => {
    expect(
      load({ EXPO_ACCESS_TOKEN: 'token-de-prueba' }).push.expoAccessToken,
    ).toBe('token-de-prueba');
    expect(load().push.expoAccessToken).toBeUndefined();
  });
});
