import { describe, expect, it, vi } from 'vitest';
import type { Auth } from '@/modules/auth/infrastructure/better-auth/auth.factory.js';
import { BetterAuthPasswordHasher } from '@/modules/auth/infrastructure/better-auth/better-auth-password-hasher.js';

describe('BetterAuthPasswordHasher.hash', () => {
  it('delega en el algoritmo de better-auth', async () => {
    const hash = vi.fn((password: string) =>
      Promise.resolve(`hash(${password})`),
    );
    const hasher = new BetterAuthPasswordHasher({
      $context: Promise.resolve({ password: { hash } }),
    } as unknown as Auth);

    await expect(hasher.hash('una-contraseña')).resolves.toBe(
      'hash(una-contraseña)',
    );
    expect(hash).toHaveBeenCalledWith('una-contraseña');
  });
});

describe('BetterAuthPasswordHasher.verify', () => {
  it('delega en el algoritmo de better-auth con el hash y la contraseña', async () => {
    const verify = vi.fn(() => Promise.resolve(true));
    const hasher = new BetterAuthPasswordHasher({
      $context: Promise.resolve({ password: { verify } }),
    } as unknown as Auth);

    await expect(
      hasher.verify('una-contraseña', 'hash-guardado'),
    ).resolves.toBe(true);
    expect(verify).toHaveBeenCalledExactlyOnceWith({
      hash: 'hash-guardado',
      password: 'una-contraseña',
    });
  });

  it('devuelve false cuando no coincide', async () => {
    const verify = vi.fn(() => Promise.resolve(false));
    const hasher = new BetterAuthPasswordHasher({
      $context: Promise.resolve({ password: { verify } }),
    } as unknown as Auth);

    await expect(
      hasher.verify('otra-contraseña', 'hash-guardado'),
    ).resolves.toBe(false);
  });
});
