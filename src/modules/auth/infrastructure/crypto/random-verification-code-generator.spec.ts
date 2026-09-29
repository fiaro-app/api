import { describe, expect, it } from 'vitest';
import { RandomVerificationCodeGenerator } from '@/modules/auth/infrastructure/crypto/random-verification-code-generator.js';

describe('RandomVerificationCodeGenerator.next', () => {
  it('da códigos de 6 dígitos, con ceros a la izquierda si hace falta', () => {
    const generator = new RandomVerificationCodeGenerator();

    for (let i = 0; i < 200; i += 1) {
      const code = generator.next();
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it('no siempre da el mismo código', () => {
    const generator = new RandomVerificationCodeGenerator();

    const codes = new Set(Array.from({ length: 50 }, () => generator.next()));

    expect(codes.size).toBeGreaterThan(1);
  });
});
