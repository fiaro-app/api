import { describe, expect, it } from 'vitest';
import type { Env } from '@/config/env.js';
import { EnvMobileVersionConfigProvider } from '@/modules/system/infrastructure/providers/env-mobile-version-config.provider.js';

describe('EnvMobileVersionConfigProvider', () => {
  it('expone la configuración del entorno tal cual', () => {
    const env = {
      mobile: {
        minimumSupportedVersion: '1.2.0',
        latestVersion: '1.4.1',
        downloadUrl: 'https://fiaro.co/app.apk',
      },
    } as Env;

    expect(new EnvMobileVersionConfigProvider(env).get()).toEqual(env.mobile);
  });
});
