import { Inject, Injectable } from '@nestjs/common';
import type { HealthStatus } from '@/modules/system/application/dtos/health-status.dto.js';
import type { SystemStatusProvider } from '@/modules/system/application/ports/system-status-provider.port.js';
import { SYSTEM_STATUS_PROVIDER } from '@/modules/system/application/ports/system-status-provider.token.js';
import { MaintenanceModeError } from '@/modules/system/domain/errors/maintenance-mode.error.js';

/**
 * El healthcheck de `GET /health` (D-90): por TCP ya lo tenía el contenedor, pero Fly.io exige uno
 * HTTP (ARCHITECTURE.md). Sin `LenderScopeGuard` ni sesión (`@Public()`): lo llama el orquestador,
 * no una persona.
 */
@Injectable()
export class GetHealthUseCase {
  constructor(
    @Inject(SYSTEM_STATUS_PROVIDER)
    private readonly status: SystemStatusProvider,
  ) {}

  /** @throws {@link MaintenanceModeError} Si operaciones declaró una ventana de mantenimiento. */
  execute(): HealthStatus {
    if (this.status.isUnderMaintenance()) {
      throw new MaintenanceModeError();
    }
    return { status: 'ok', version: this.status.getAppVersion() };
  }
}
