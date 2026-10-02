import { describe, expect, it } from 'vitest';
import type { Env } from '@/config/env.js';
import { EnvSystemStatusProvider } from '@/modules/system/infrastructure/providers/env-system-status.provider.js';

describe('EnvSystemStatusProvider', () => {
  it('lee la versión de package.json', () => {
    const provider = new EnvSystemStatusProvider({
      maintenanceMode: false,
    } as Env);

    expect(provider.getAppVersion()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('refleja MAINTENANCE_MODE', () => {
    expect(
      new EnvSystemStatusProvider({
        maintenanceMode: false,
      } as Env).isUnderMaintenance(),
    ).toBe(false);
    expect(
      new EnvSystemStatusProvider({
        maintenanceMode: true,
      } as Env).isUnderMaintenance(),
    ).toBe(true);
  });
});
