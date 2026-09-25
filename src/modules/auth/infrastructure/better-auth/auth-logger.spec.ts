import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loggerOptions } from '@/modules/auth/infrastructure/better-auth/auth-options.js';
import { logToNest } from '@/modules/auth/infrastructure/better-auth/auth-logger.js';

describe('logToNest', () => {
  const nest = {
    error: vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined),
    warn: vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined),
    log: vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined),
    debug: vi
      .spyOn(Logger.prototype, 'debug')
      .mockImplementation(() => undefined),
  };

  afterEach(() => {
    for (const spy of Object.values(nest)) {
      spy.mockClear();
    }
  });

  it.each([
    ['error', 'error'],
    ['warn', 'warn'],
    ['info', 'log'],
    ['debug', 'debug'],
  ] as const)(
    'un mensaje de nivel %s sale por el logger de Nest (%s)',
    (level, method) => {
      logToNest(level, 'Invalid password');

      expect(nest[method]).toHaveBeenCalledExactlyOnceWith('Invalid password');
    },
  );

  it('agrega los datos extra al mensaje: los textos tal cual, un error con su traza y lo demás legible', () => {
    const error = new Error('falló');

    logToNest('error', 'No se pudo', 'detalle', error, { id: 1 });

    const [text] = nest.error.mock.calls[0] ?? [];
    expect(String(text)).toContain('No se pudo detalle');
    expect(String(text)).toContain('Error: falló');
    expect(String(text)).toContain('{ id: 1 }');
  });

  it('un error sin traza deja su mensaje', () => {
    const error = new Error('sin traza');
    error.stack = undefined;

    logToNest('warn', 'Aviso', error);

    expect(nest.warn).toHaveBeenCalledWith('Aviso sin traza');
  });
});

describe('loggerOptions', () => {
  it('escribe por el logger de Nest, solo avisos y errores', () => {
    expect(loggerOptions('production')).toEqual({
      disabled: false,
      level: 'warn',
      log: logToNest,
    });
  });

  it('en las pruebas está apagado: los rechazos son esperados', () => {
    expect(loggerOptions('test').disabled).toBe(true);
  });
});
