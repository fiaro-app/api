import { describe, expect, it } from 'vitest';
import { Sha256VerificationCodeHasher } from '@/modules/auth/infrastructure/crypto/sha256-verification-code-hasher.js';

describe('Sha256VerificationCodeHasher.hash', () => {
  it('el mismo código siempre da el mismo hash', () => {
    const hasher = new Sha256VerificationCodeHasher();

    expect(hasher.hash('048213')).toBe(hasher.hash('048213'));
  });

  it('códigos distintos dan hashes distintos', () => {
    const hasher = new Sha256VerificationCodeHasher();

    expect(hasher.hash('048213')).not.toBe(hasher.hash('048214'));
  });

  it('nunca guarda el código en claro dentro del hash', () => {
    const hasher = new Sha256VerificationCodeHasher();

    expect(hasher.hash('048213')).not.toContain('048213');
  });
});
