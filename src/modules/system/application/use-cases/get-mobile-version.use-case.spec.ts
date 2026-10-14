import { describe, expect, it, vi } from 'vitest';
import type { MobileVersionDetails } from '@/modules/system/application/dtos/mobile-version-details.dto.js';
import type { MobileVersionConfigProvider } from '@/modules/system/application/ports/mobile-version-config-provider.port.js';
import { GetMobileVersionUseCase } from '@/modules/system/application/use-cases/get-mobile-version.use-case.js';

const CONFIG: MobileVersionDetails = {
  minimumSupportedVersion: '1.2.0',
  latestVersion: '1.4.1',
  downloadUrl: 'https://fiaro.co/app.apk',
};

describe('GetMobileVersionUseCase', () => {
  it('devuelve la configuración del version-gate tal cual', () => {
    const config: MobileVersionConfigProvider = { get: vi.fn(() => CONFIG) };
    const useCase = new GetMobileVersionUseCase(config);

    expect(useCase.execute()).toEqual(CONFIG);
  });
});
