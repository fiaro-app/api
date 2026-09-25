import { describe, expect, it } from 'vitest';
import { toLogEntries } from '@/shared/infrastructure/logging/log-entry.js';

const TIME = '2026-09-25T10:00:00.000Z';

const line = (fields: Record<string, unknown> = {}): string =>
  `${JSON.stringify({ level: 'info', time: TIME, msg: 'request completed', ...fields })}\n`;

describe('toLogEntries', () => {
  it('lee cada línea como un registro con todos sus campos', () => {
    const entries = toLogEntries([
      line({
        requestId: 'r1',
        req: { method: 'POST', path: '/auth/sign-out' },
        res: { statusCode: 200 },
      }),
    ]);

    expect(entries).toEqual([
      {
        level: 'info',
        time: TIME,
        msg: 'request completed',
        requestId: 'r1',
        req: { method: 'POST', path: '/auth/sign-out' },
        res: { statusCode: 200 },
      },
    ]);
  });

  it('deja los registros en el orden de las líneas', () => {
    const entries = toLogEntries([
      line({ n: 1 }),
      line({ n: 2 }),
      line({ n: 3 }),
    ]);

    expect(entries.map((entry) => entry.n)).toEqual([1, 2, 3]);
  });

  it('descarta lo que no es JSON', () => {
    expect(toLogEntries(['esto no es json\n', '{"level":"info"'])).toEqual([]);
  });

  it.each([
    ['un número', '42'],
    ['un texto', '"hola"'],
    ['un arreglo', '[1,2]'],
    ['null', 'null'],
  ])('descarta %s', (_name, json) => {
    expect(toLogEntries([json])).toEqual([]);
  });

  it('descarta una línea sin nivel o sin hora', () => {
    expect(
      toLogEntries([
        JSON.stringify({ time: TIME, msg: 'sin nivel' }),
        JSON.stringify({ level: 'info', msg: 'sin hora' }),
      ]),
    ).toEqual([]);
  });

  it('descarta una hora que no es una fecha', () => {
    expect(toLogEntries([line({ time: 'ayer por la tarde' })])).toEqual([]);
  });

  it('descarta los eventos de auditoría, que tienen su propia colección', () => {
    const entries = toLogEntries([
      line({ msg: 'una petición' }),
      line({ audit: true, event: 'auth.sign_in.succeeded' }),
    ]);

    expect(entries.map((entry) => entry.msg)).toEqual(['una petición']);
  });

  it('conserva una línea cuyo campo audit no es true', () => {
    expect(toLogEntries([line({ audit: 'no' })])).toHaveLength(1);
  });
});
