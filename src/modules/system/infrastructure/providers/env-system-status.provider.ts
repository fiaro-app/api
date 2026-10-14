import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { Env } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';
import type { SystemStatusProvider } from '@/modules/system/application/ports/system-status-provider.port.js';

const PackageManifestSchema = z.object({ version: z.string() });

/** Lee `package.json` una sola vez: su versión no cambia mientras el proceso sigue corriendo. */
function readAppVersion(): string {
  const raw = readFileSync(join(process.cwd(), 'package.json'), 'utf-8');
  return PackageManifestSchema.parse(JSON.parse(raw)).version;
}

/**
 * Versión de `package.json` y el interruptor de mantenimiento (`MAINTENANCE_MODE`), ambos
 * leídos una sola vez al construirse.
 */
@Injectable()
export class EnvSystemStatusProvider implements SystemStatusProvider {
  private readonly appVersion = readAppVersion();

  constructor(@Inject(ENV) private readonly env: Env) {}

  getAppVersion(): string {
    return this.appVersion;
  }

  isUnderMaintenance(): boolean {
    return this.env.maintenanceMode;
  }
}
