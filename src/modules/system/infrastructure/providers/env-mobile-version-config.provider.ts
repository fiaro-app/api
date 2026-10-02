import { Inject, Injectable } from '@nestjs/common';
import type { Env } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';
import type { MobileVersionDetails } from '@/modules/system/application/dtos/mobile-version-details.dto.js';
import type { MobileVersionConfigProvider } from '@/modules/system/application/ports/mobile-version-config-provider.port.js';

/**
 * La configuración del version-gate sale de variables de entorno (`MOBILE_MIN_SUPPORTED_VERSION`,
 * `MOBILE_LATEST_VERSION`, `MOBILE_DOWNLOAD_URL`): cambia solo cuando sale una build nativa nueva
 * (ARCHITECTURE.md §10, Firebase App Distribution), un evento ya coordinado a mano, así que no
 * hace falta un panel ni una tabla para editarla en caliente.
 */
@Injectable()
export class EnvMobileVersionConfigProvider implements MobileVersionConfigProvider {
  constructor(@Inject(ENV) private readonly env: Env) {}

  get(): MobileVersionDetails {
    return {
      minimumSupportedVersion: this.env.mobile.minimumSupportedVersion,
      latestVersion: this.env.mobile.latestVersion,
      downloadUrl: this.env.mobile.downloadUrl,
    };
  }
}
