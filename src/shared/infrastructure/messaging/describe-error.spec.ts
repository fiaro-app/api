import { describe, expect, it } from 'vitest';
import { describeConnectionError } from '@/shared/infrastructure/messaging/describe-error.js';

describe('describeConnectionError', () => {
  it('devuelve el mensaje del error si lo tiene', () => {
    expect(describeConnectionError(new Error('connect ETIMEDOUT'))).toBe(
      'connect ETIMEDOUT',
    );
  });

  it('en un AggregateError sin mensaje, une el de cada intento fallido', () => {
    const error = new AggregateError(
      [
        new Error('connect ECONNREFUSED ::1:6379'),
        new Error('connect ECONNREFUSED 127.0.0.1:6379'),
      ],
      '',
    );

    expect(describeConnectionError(error)).toBe(
      'connect ECONNREFUSED ::1:6379; connect ECONNREFUSED 127.0.0.1:6379',
    );
  });

  it('convierte en texto las causas que no son errores', () => {
    expect(describeConnectionError(new AggregateError(['sin ruta'], ''))).toBe(
      'sin ruta',
    );
  });

  it('sin mensaje ni causas usa el code del sistema', () => {
    const error = Object.assign(new Error(''), { code: 'ECONNRESET' });

    expect(describeConnectionError(error)).toBe('ECONNRESET');
  });

  it('un AggregateError vacío también cae en el code', () => {
    const error = Object.assign(new AggregateError([], ''), {
      code: 'ECONNREFUSED',
    });

    expect(describeConnectionError(error)).toBe('ECONNREFUSED');
  });

  it('sin nada más usa el nombre del error', () => {
    expect(describeConnectionError(new TypeError(''))).toBe('TypeError');
  });
});
