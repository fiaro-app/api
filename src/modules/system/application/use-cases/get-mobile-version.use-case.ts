import { Inject, Injectable } from '@nestjs/common';
import type { MobileVersionDetails } from '@/modules/system/application/dtos/mobile-version-details.dto.js';
import type { MobileVersionConfigProvider } from '@/modules/system/application/ports/mobile-version-config-provider.port.js';
import { MOBILE_VERSION_CONFIG_PROVIDER } from '@/modules/system/application/ports/mobile-version-config-provider.token.js';

/**
 * El version-gate de `GET /mobile/version` (D-90, PRODUCT.md §10): la app lo consulta antes de
 * mostrar cualquier pantalla. Sin parámetros: compara su propia versión contra lo que devuelve
 * esta ruta, con `compareAppVersions` de `@fiaro-app/contracts`.
 */
@Injectable()
export class GetMobileVersionUseCase {
  constructor(
    @Inject(MOBILE_VERSION_CONFIG_PROVIDER)
    private readonly config: MobileVersionConfigProvider,
  ) {}

  execute(): MobileVersionDetails {
    return this.config.get();
  }
}
