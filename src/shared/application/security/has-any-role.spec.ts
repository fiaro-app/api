import { describe, expect, it } from 'vitest';
import { hasAnyRole } from '@/shared/application/security/has-any-role.js';

describe('hasAnyRole', () => {
  it('con un rol que sí está entre los exigidos, es true', () => {
    expect(hasAnyRole(['LENDER'], ['OWNER', 'LENDER'])).toBe(true);
  });

  it('con ninguno de los roles exigidos, es false', () => {
    expect(hasAnyRole(['COLLECTOR'], ['OWNER', 'LENDER'])).toBe(false);
  });

  it('sin roles, es false', () => {
    expect(hasAnyRole([], ['OWNER', 'LENDER'])).toBe(false);
  });

  it('con varios roles propios, basta con que uno coincida', () => {
    expect(hasAnyRole(['OWNER', 'LENDER', 'COLLECTOR'], ['LENDER'])).toBe(true);
  });
});
