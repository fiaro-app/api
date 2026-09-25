import { describe, expect, it } from 'vitest';
import { fanOutDestination } from '@/shared/infrastructure/logging/fan-out-destination.js';

describe('fanOutDestination', () => {
  it('entrega cada línea al destino principal y después a la copia', () => {
    const order: string[] = [];
    const destination = fanOutDestination(
      { write: (line) => order.push(`principal:${line}`) },
      { write: (line) => order.push(`copia:${line}`) },
    );

    destination.write('a\n');
    destination.write('b\n');

    expect(order).toEqual([
      'principal:a\n',
      'copia:a\n',
      'principal:b\n',
      'copia:b\n',
    ]);
  });
});
