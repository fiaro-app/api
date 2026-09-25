import { describe, expect, it } from 'vitest';
import { loadEnv } from '@/config/env.js';
import { LOG_LEVELS } from '@/config/env-fields.js';
import { REQUIRED_ENV } from '@test/support/required-env.js';

const load = (source: NodeJS.ProcessEnv = {}) =>
  loadEnv({ ...REQUIRED_ENV, ...source });

describe('LOG_LEVEL', () => {
  it.each([
    ['development', {}],
    ['production', { TRUST_PROXY: '1' }],
  ])('por defecto es info en %s', (nodeEnv, extra) => {
    expect(load({ NODE_ENV: nodeEnv, ...extra }).logLevel).toBe('info');
  });

  it('sin NODE_ENV también es info', () => {
    expect(load().logLevel).toBe('info');
  });

  it('por defecto es silent en las pruebas, para no llenar su salida', () => {
    expect(load({ NODE_ENV: 'test' }).logLevel).toBe('silent');
  });

  it.each(LOG_LEVELS)('acepta %s', (level) => {
    expect(load({ LOG_LEVEL: level }).logLevel).toBe(level);
  });

  it('una variable explícita gana sobre el valor por defecto de las pruebas', () => {
    expect(load({ NODE_ENV: 'test', LOG_LEVEL: 'debug' }).logLevel).toBe(
      'debug',
    );
  });

  it.each(['verbose', 'INFO', 'warning', '', '1'])('rechaza «%s»', (level) => {
    expect(() => load({ LOG_LEVEL: level })).toThrow(/LOG_LEVEL/);
  });

  it('el error dice qué niveles existen', () => {
    expect(() => load({ LOG_LEVEL: 'ruidoso' })).toThrow(
      /fatal, error, warn, info, debug, trace o silent/,
    );
  });
});
