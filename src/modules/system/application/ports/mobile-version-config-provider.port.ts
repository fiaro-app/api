import type { MobileVersionDetails } from '@/modules/system/application/dtos/mobile-version-details.dto.js';

/** De dónde {@link GetMobileVersionUseCase} saca la configuración del version-gate móvil. */
export interface MobileVersionConfigProvider {
  /** @returns La versión mínima y más reciente configuradas, con el enlace de descarga. */
  get(): MobileVersionDetails;
}
