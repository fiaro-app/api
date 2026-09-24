import { describe, expect, it } from 'vitest';
import { Uuid7IdGenerator } from '@/shared/infrastructure/runtime/uuid7-id-generator.js';

const UUID_V7 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('Uuid7IdGenerator', () => {
  const generator = new Uuid7IdGenerator();

  it('genera UUID versión 7', () => {
    expect(generator.next()).toMatch(UUID_V7);
  });

  it('no repite identificadores', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generator.next()));

    expect(ids.size).toBe(1000);
  });

  it('los ordena por fecha de creación', async () => {
    const first = generator.next();
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = generator.next();

    expect(first < second).toBe(true);
  });
});
