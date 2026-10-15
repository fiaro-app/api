import { describe, expect, it } from 'vitest';
import { isCollectorOnly } from '@/shared/application/security/is-collector-only.js';

describe('isCollectorOnly', () => {
  it('es verdadero solo para quien únicamente cobra', () => {
    expect(isCollectorOnly(['COLLECTOR'])).toBe(true);
  });

  it('quien además administra ve todo', () => {
    expect(isCollectorOnly(['COLLECTOR', 'LENDER'])).toBe(false);
    expect(isCollectorOnly(['OWNER', 'LENDER', 'COLLECTOR'])).toBe(false);
  });
});
