import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { technicalEmailFor } from '@/modules/auth/infrastructure/better-auth/technical-email.js';

describe('technicalEmailFor', () => {
  it('se deriva del celular, sin el signo más', () => {
    expect(technicalEmailFor('+573001234567')).toBe(
      '573001234567@phone.fiaro.invalid',
    );
  });

  it('es distinto para cada celular', () => {
    expect(technicalEmailFor('+573001234567')).not.toBe(
      technicalEmailFor('+573001234568'),
    );
  });

  it('tiene forma de email para que better-auth lo acepte, pero en un dominio que nunca resuelve', () => {
    const email = technicalEmailFor('+573001234567');

    expect(z.email().safeParse(email).success).toBe(true);
    expect(email.endsWith('.invalid')).toBe(true);
  });
});
