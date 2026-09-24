import { afterEach, describe, expect, it, vi } from 'vitest';
import { SystemClock } from '@/shared/infrastructure/runtime/system-clock.js';

describe('SystemClock', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('devuelve la hora actual', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-23T12:00:00-05:00'));

    expect(new SystemClock().now()).toEqual(new Date('2026-09-23T17:00:00Z'));
  });
});
