import { describe, expect, it } from 'vitest';
import {
  createLogger,
  REDACTED_TEXT,
} from '@/shared/infrastructure/logging/logger.factory.js';
import { runWithRequestContext } from '@/shared/infrastructure/logging/request-context.js';
import { captureLogs } from '@test/support/log-capture.js';

describe('createLogger', () => {
  it('escribe una línea de JSON con el nivel como texto, la hora ISO y el servicio', () => {
    const logs = captureLogs();

    createLogger({ level: 'info', destination: logs.destination }).info('hola');

    const [entry] = logs.entries();
    expect(entry).toMatchObject({
      level: 'info',
      msg: 'hola',
      service: 'fiaro-api',
    });
    expect(entry?.time).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it('no escribe lo que está por debajo del nivel', () => {
    const logs = captureLogs();
    const logger = createLogger({
      level: 'warn',
      destination: logs.destination,
    });

    logger.info('no');
    logger.warn('sí');

    expect(logs.entries().map((entry) => entry.msg)).toEqual(['sí']);
  });

  it('con el nivel silent no escribe nada', () => {
    const logs = captureLogs();

    createLogger({ level: 'silent', destination: logs.destination }).fatal('x');

    expect(logs.entries()).toEqual([]);
  });

  describe('el identificador de la petición', () => {
    it('sale en cada línea escrita mientras se atiende', () => {
      const logs = captureLogs();
      const logger = createLogger({
        level: 'info',
        destination: logs.destination,
      });

      runWithRequestContext({ requestId: 'req-1234567' }, () => {
        logger.info('dentro');
      });

      expect(logs.entries()[0]).toMatchObject({ requestId: 'req-1234567' });
    });

    it('no aparece fuera de una petición', () => {
      const logs = captureLogs();

      createLogger({ level: 'info', destination: logs.destination }).info(
        'fuera',
      );

      expect(logs.entries()[0]).not.toHaveProperty('requestId');
    });
  });

  describe('datos protegidos, aunque se agreguen por descuido', () => {
    it.each([
      ['la cookie de la petición', { req: { headers: { cookie: 'a=b' } } }],
      [
        'la autorización de la petición',
        { req: { headers: { authorization: 'Bearer x' } } },
      ],
      [
        'el Set-Cookie de la respuesta',
        { res: { headers: { 'set-cookie': ['a=b'] } } },
      ],
      ['una contraseña', { user: { password: 'p' } }],
      ['la contraseña actual', { body: { currentPassword: 'p' } }],
      ['la contraseña nueva', { body: { newPassword: 'p' } }],
      ['un token', { session: { token: 't' } }],
      ['un secreto', { config: { secret: 's' } }],
    ])('reemplaza %s', (_caso, data) => {
      const logs = captureLogs();

      createLogger({ level: 'info', destination: logs.destination }).info(
        data,
        'con datos',
      );

      expect(logs.text()).toContain(REDACTED_TEXT);
      expect(logs.text()).not.toMatch(/a=b|Bearer x|"p"|"t"|"s"/);
    });

    it('deja intactos los demás campos', () => {
      const logs = captureLogs();

      createLogger({ level: 'info', destination: logs.destination }).info(
        { req: { headers: { cookie: 'a=b', 'user-agent': 'curl' } } },
        'con datos',
      );

      expect(logs.entries()[0]).toMatchObject({
        req: { headers: { cookie: REDACTED_TEXT, 'user-agent': 'curl' } },
      });
    });
  });
});
