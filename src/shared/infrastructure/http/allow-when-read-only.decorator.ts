import { SetMetadata } from '@nestjs/common';

/** Clave del metadato que {@link AllowWhenReadOnly} deja en la ruta. */
export const ALLOW_WHEN_READ_ONLY = 'fiaro:allow-when-read-only';

/**
 * Deja que una ruta de escritura siga funcionando cuando la suscripción está en solo lectura:
 * registrar visitas y pagos y cerrar el cuadre del día nunca se bloquea (PRODUCT.md §7, D-148).
 * Va en el handler, en un controller con `LenderScopeGuard`.
 */
export const AllowWhenReadOnly = () => SetMetadata(ALLOW_WHEN_READ_ONLY, true);
