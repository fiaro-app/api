import { describe, expect, it } from 'vitest';
import { createLogger } from '@/shared/infrastructure/logging/logger.factory.js';
import { PinoNestLogger } from '@/shared/infrastructure/logging/nest-logger.js';
import { captureLogs } from '@test/support/log-capture.js';

function build() {
  const logs = captureLogs();
  const logger = new PinoNestLogger(
    createLogger({ level: 'trace', destination: logs.destination }),
  );
  return { logger, entries: logs.entries };
}

const STACK = 'Error: falló\n    at fn (archivo.ts:1:1)';

describe('PinoNestLogger', () => {
  it('escribe el mensaje como info con su contexto', () => {
    const { logger, entries } = build();

    logger.log('Nest arrancó', 'NestApplication');

    expect(entries()[0]).toMatchObject({
      level: 'info',
      msg: 'Nest arrancó',
      context: 'NestApplication',
    });
  });

  it('sin contexto no agrega el campo', () => {
    const { logger, entries } = build();

    logger.log('Nest arrancó');

    expect(entries()[0]).not.toHaveProperty('context');
  });

  it.each([
    ['warn', 'warn'],
    ['debug', 'debug'],
    ['verbose', 'trace'],
    ['fatal', 'fatal'],
  ] as const)('%s se escribe con el nivel %s de Pino', (method, level) => {
    const { logger, entries } = build();

    logger[method]('aviso', 'Sonda');

    expect(entries()[0]).toMatchObject({
      level,
      msg: 'aviso',
      context: 'Sonda',
    });
  });

  describe('errores', () => {
    it('con traza y contexto (mensaje, traza, contexto)', () => {
      const { logger, entries } = build();

      logger.error('falló', STACK, 'ExceptionsHandler');

      expect(entries()[0]).toMatchObject({
        level: 'error',
        msg: 'falló',
        stack: STACK,
        context: 'ExceptionsHandler',
      });
    });

    it('con solo contexto (mensaje, contexto)', () => {
      const { logger, entries } = build();

      logger.error('falló', 'ExceptionsHandler');

      const [entry] = entries();
      expect(entry).toMatchObject({ context: 'ExceptionsHandler' });
      expect(entry).not.toHaveProperty('stack');
    });

    it('con solo traza (mensaje, traza)', () => {
      const { logger, entries } = build();

      logger.error('falló', STACK);

      const [entry] = entries();
      expect(entry).toMatchObject({ stack: STACK });
      expect(entry).not.toHaveProperty('context');
    });

    it('un Error se escribe con su tipo, mensaje y traza', () => {
      const { logger, entries } = build();

      logger.error(new Error('boom'), 'ExceptionsHandler');

      expect(entries()[0]).toMatchObject({
        level: 'error',
        msg: 'boom',
        context: 'ExceptionsHandler',
        err: { type: 'Error', message: 'boom' },
      });
    });
  });

  describe('mensajes que no son texto', () => {
    it('un objeto se abre en campos del registro', () => {
      const { logger, entries } = build();

      logger.log({ evento: 'pago', monto: 1000 }, 'Cobros');

      expect(entries()[0]).toMatchObject({
        level: 'info',
        evento: 'pago',
        monto: 1000,
        context: 'Cobros',
      });
    });

    it.each([
      ['un número', 42],
      ['una lista', ['a', 'b']],
      ['null', null],
    ])('%s va en el campo message', (_caso, message) => {
      const { logger, entries } = build();

      logger.log(message);

      expect(entries()[0]).toMatchObject({ message });
    });
  });
});
