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

describe('aviso diario de mora (D-96)', () => {
  it('fuera de las pruebas, corre por defecto, también en producción', () => {
    expect(load().moraAlerts.enabled).toBe(true);
    expect(load(PRODUCTION).moraAlerts.enabled).toBe(true);
  });

  it('en las pruebas no corre, para que ningún caso reciba avisos que no pidió', () => {
    expect(load({ NODE_ENV: 'test' }).moraAlerts.enabled).toBe(false);
  });

  it('MORA_ALERTS decide cuando viene, en cualquier entorno', () => {
    expect(
      load({ NODE_ENV: 'test', MORA_ALERTS: 'true' }).moraAlerts.enabled,
    ).toBe(true);
    expect(load({ MORA_ALERTS: 'false' }).moraAlerts.enabled).toBe(false);
  });

  it('rechaza un MORA_ALERTS que no sea booleano', () => {
    expect(() => load({ MORA_ALERTS: 'quizá' })).toThrow(/MORA_ALERTS/);
  });
});
