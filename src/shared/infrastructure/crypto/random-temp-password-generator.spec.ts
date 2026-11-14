import { describe, expect, it } from 'vitest';
import { RandomTempPasswordGenerator } from '@/shared/infrastructure/crypto/random-temp-password-generator.js';

describe('RandomTempPasswordGenerator.next', () => {
  it('da contraseñas de 16 caracteres, sin 0/O/1/l/I', () => {
    const generator = new RandomTempPasswordGenerator();

    for (let i = 0; i < 200; i += 1) {
      const password = generator.next();
      expect(password).toMatch(/^[A-Za-z0-9]{16}$/);
      expect(password).not.toMatch(/[0O1lI]/);
    }
  });

  it('no siempre da la misma contraseña', () => {
    const generator = new RandomTempPasswordGenerator();

    const passwords = new Set(
      Array.from({ length: 50 }, () => generator.next()),
    );

    expect(passwords.size).toBeGreaterThan(1);
  });
});
