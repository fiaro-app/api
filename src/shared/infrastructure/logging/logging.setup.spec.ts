import type { NestExpressApplication } from '@nestjs/platform-express';
import pino from 'pino';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadEnv } from '@/config/env.js';
import { setupLogging } from '@/shared/infrastructure/logging/logging.setup.js';
import { PinoNestLogger } from '@/shared/infrastructure/logging/nest-logger.js';
import { captureLogs } from '@test/support/log-capture.js';
import { REQUIRED_ENV } from '@test/support/required-env.js';

const envWith = (logLevel: string) =>
  loadEnv({ ...REQUIRED_ENV, LOG_LEVEL: logLevel });

function fakeApp() {
  const useLogger = vi.fn();
  const use = vi.fn();
  return {
    app: { useLogger, use } as unknown as NestExpressApplication,
    useLogger,
    use,
  };
}

describe('setupLogging', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('instala Pino como logger de Nest y el middleware de las peticiones', () => {
    const { app, useLogger, use } = fakeApp();

    setupLogging(app, envWith('info'), {
      destination: captureLogs().destination,
    });

    expect(useLogger).toHaveBeenCalledWith(expect.any(PinoNestLogger));
    expect(use).toHaveBeenCalledTimes(1);
    expect(use).toHaveBeenCalledWith(expect.any(Function));
  });

  it('escribe en el destino indicado y respeta el nivel de la configuración', () => {
    const { app, useLogger } = fakeApp();
    const logs = captureLogs();

    setupLogging(app, envWith('warn'), { destination: logs.destination });
    const nestLogger = (useLogger.mock.calls[0] as [PinoNestLogger])[0];
    nestLogger.log('no se escribe');
    nestLogger.warn('sí se escribe');

    expect(logs.entries().map((entry) => entry.msg)).toEqual(['sí se escribe']);
  });

  it('sin destino escribe en la salida estándar', () => {
    const { app } = fakeApp();

    expect(() => {
      setupLogging(app, envWith('silent'));
    }).not.toThrow();
  });
  it('con un batcher, cada línea sale por el destino y solo las de warn hacia arriba se le entregan', () => {
    const { app, useLogger } = fakeApp();
    const logs = captureLogs();
    const batcher = { write: vi.fn() };

    setupLogging(app, envWith('info'), {
      destination: logs.destination,
      batcher,
    });
    const nestLogger = (useLogger.mock.calls[0] as [PinoNestLogger])[0];
    nestLogger.log('sale bien');
    nestLogger.warn('sale mal');
    nestLogger.error('sale muy mal');

    expect(logs.entries().map((entry) => entry.msg)).toEqual([
      'sale bien',
      'sale mal',
      'sale muy mal',
    ]);
    expect(batcher.write).toHaveBeenCalledTimes(2);
    const copies = batcher.write.mock.calls.map(
      ([copy]) => (JSON.parse(copy as string) as { msg: string }).msg,
    );
    expect(copies).toEqual(['sale mal', 'sale muy mal']);
  });

  it('con un batcher y sin destino escribe en la salida estándar y se lo entrega', () => {
    const { app, useLogger } = fakeApp();
    const stdout = { write: vi.fn() };
    const destination = vi
      .spyOn(pino, 'destination')
      .mockReturnValue(stdout as never);
    const batcher = { write: vi.fn() };

    setupLogging(app, envWith('info'), { batcher });
    (useLogger.mock.calls[0] as [PinoNestLogger])[0].warn('hola');

    expect(destination).toHaveBeenCalledWith(1);
    expect(stdout.write).toHaveBeenCalledOnce();
    expect(batcher.write).toHaveBeenCalledOnce();
  });

  it('con el batcher en null solo escribe en el destino', () => {
    const { app, useLogger } = fakeApp();
    const logs = captureLogs();

    setupLogging(app, envWith('info'), {
      destination: logs.destination,
      batcher: null,
    });
    (useLogger.mock.calls[0] as [PinoNestLogger])[0].log('hola');

    expect(logs.entries().map((entry) => entry.msg)).toEqual(['hola']);
  });
});
