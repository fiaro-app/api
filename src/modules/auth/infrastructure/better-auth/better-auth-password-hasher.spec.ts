import { describe, expect, it, vi } from 'vitest';
import type { Auth } from '@/modules/auth/infrastructure/better-auth/auth.factory.js';
import { BetterAuthPasswordHasher } from '@/modules/auth/infrastructure/better-auth/better-auth-password-hasher.js';

describe('BetterAuthPasswordHasher', () => {
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
