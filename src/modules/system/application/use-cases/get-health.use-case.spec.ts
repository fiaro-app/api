import { describe, expect, it, vi } from 'vitest';
import { GetHealthUseCase } from '@/modules/system/application/use-cases/get-health.use-case.js';
import type { SystemStatusProvider } from '@/modules/system/application/ports/system-status-provider.port.js';
import { MaintenanceModeError } from '@/modules/system/domain/errors/maintenance-mode.error.js';

function setup(underMaintenance: boolean) {
  const status: SystemStatusProvider = {
    getAppVersion: vi.fn(() => '0.0.1'),
    isUnderMaintenance: vi.fn(() => underMaintenance),
  };
  return { useCase: new GetHealthUseCase(status), status };
}

describe('GetHealthUseCase', () => {
  it('responde ok con la versión desplegada', () => {
    const { useCase } = setup(false);

    expect(useCase.execute()).toEqual({ status: 'ok', version: '0.0.1' });
  });

  it('rechaza mientras dure la ventana de mantenimiento', () => {
    const { useCase } = setup(true);

    expect(() => useCase.execute()).toThrow(MaintenanceModeError);
  });
});
