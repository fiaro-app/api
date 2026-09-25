import { describe, expect, it } from 'vitest';
import { toLogDocuments } from '@/shared/infrastructure/logging/log-document.js';

const RECORDED_AT = new Date('2026-09-25T10:05:00.000Z');

describe('toLogDocuments', () => {
  const entries = [
    {
      level: 'info',
      time: '2026-09-25T10:00:00.000Z',
      msg: 'request completed',
      req: { method: 'GET', path: '/auth/get-session' },
    },
    { level: 'warn', time: '2026-09-25T10:00:01.500Z', msg: 'lento' },
  ];

  it('el _id es el del lote y la posición de la línea', () => {
    const documents = toLogDocuments('lote-1', entries, RECORDED_AT);

    expect(documents.map((document) => document._id)).toEqual([
      'lote-1:0',
      'lote-1:1',
    ]);
  });

  it('la hora pasa a ser una fecha, que es lo que el índice TTL necesita', () => {
    const [first, second] = toLogDocuments('lote-1', entries, RECORDED_AT);

    expect(first?.time).toEqual(new Date('2026-09-25T10:00:00.000Z'));
    expect(second?.time.toISOString()).toBe('2026-09-25T10:00:01.500Z');
  });

  it('agrega cuándo se guardó y conserva el resto de los campos', () => {
    const [first] = toLogDocuments('lote-1', entries, RECORDED_AT);

    expect(first).toMatchObject({
      level: 'info',
      msg: 'request completed',
      req: { method: 'GET', path: '/auth/get-session' },
      recordedAt: RECORDED_AT,
    });
  });

  it('un lote sin líneas no produce documentos', () => {
    expect(toLogDocuments('lote-1', [], RECORDED_AT)).toEqual([]);
  });
});
