import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '@/config/env.js';
import { TurnstileService } from '@/shared/infrastructure/turnstile/turnstile.service.js';

const env = (overrides: Partial<Env['turnstile']> = {}): Env =>
  ({
    turnstile: {
      secretKey: 'secret',
      hostnames: ['fiaro.example'],
      enabled: true,
      ...overrides,
    },
  }) as Env;

describe('TurnstileService', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('omite Siteverify si Turnstile está deshabilitado', async () => {
    const service = new TurnstileService(
      env({ enabled: false, secretKey: undefined }),
    );

    await expect(service.validateToken()).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('envía el token y la IP a Siteverify y acepta la acción y hostname esperados', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          action: 'lead',
          hostname: 'fiaro.example',
        }),
    });
    const service = new TurnstileService(env());

    await expect(
      service.validateToken('token', '203.0.113.1', 'lead'),
    ).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({
        method: 'POST',
        body: 'secret=secret&response=token&remoteip=203.0.113.1',
      }),
    );
  });

  it.each([
    {
      response: { success: false, 'error-codes': ['invalid-input-response'] },
      description: 'token inválido',
    },
    {
      response: {
        success: true,
        action: 'register',
        hostname: 'fiaro.example',
      },
      description: 'acción distinta',
    },
    {
      response: { success: true, action: 'lead', hostname: 'otro.example' },
      description: 'hostname distinto',
    },
  ])('rechaza un $description', async ({ response }) => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(response),
    });
    const service = new TurnstileService(env());

    await expect(
      service.validateToken('token', '203.0.113.1', 'lead'),
    ).resolves.toBe(false);
  });

  it('rechaza tokens ausentes o de más de 2048 caracteres sin consultar Cloudflare', async () => {
    const service = new TurnstileService(env());

    await expect(service.validateToken()).resolves.toBe(false);
    await expect(service.validateToken('x'.repeat(2049))).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
