import { SetMetadata } from '@nestjs/common';

/** Clave con la que `@Public()` marca una ruta o un controller. */
export const IS_PUBLIC_KEY = 'fiaro:is-public';

/**
 * Deja una ruta (o todo un controller) sin exigir sesión. Por defecto toda ruta la exige: hay
 * que decidir de forma explícita cuáles son públicas, no cuáles están protegidas.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
