import type { NestExpressApplication } from '@nestjs/platform-express';
import { describe, expect, it, vi } from 'vitest';
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
});
