import type { Provider } from '@nestjs/common';
import { MOBILE_VERSION_CONFIG_PROVIDER } from '@/modules/system/application/ports/mobile-version-config-provider.token.js';
import { SYSTEM_STATUS_PROVIDER } from '@/modules/system/application/ports/system-status-provider.token.js';
import { GetHealthUseCase } from '@/modules/system/application/use-cases/get-health.use-case.js';
import { GetMobileVersionUseCase } from '@/modules/system/application/use-cases/get-mobile-version.use-case.js';
import { EnvMobileVersionConfigProvider } from '@/modules/system/infrastructure/providers/env-mobile-version-config.provider.js';
import { EnvSystemStatusProvider } from '@/modules/system/infrastructure/providers/env-system-status.provider.js';

/** Qué implementa cada puerto del módulo. */
export const systemProviders: Provider[] = [
  { provide: SYSTEM_STATUS_PROVIDER, useClass: EnvSystemStatusProvider },
  {
    provide: MOBILE_VERSION_CONFIG_PROVIDER,
    useClass: EnvMobileVersionConfigProvider,
  },
  GetHealthUseCase,
  GetMobileVersionUseCase,
];
