const SECONDS_PER_DAY = 24 * 60 * 60;

/**
 * Cuánto dura una sesión sin actividad: 30 días (§8 de PRODUCT.md). Cada día de uso la renueva,
 * así que solo caduca quien pasa 30 días sin abrir la app.
 */
export const SESSION_LIFETIME_SECONDS = 30 * SECONDS_PER_DAY;

/** Cada cuánto, como máximo, se renueva una sesión que se está usando. */
export const SESSION_REFRESH_INTERVAL_SECONDS = SECONDS_PER_DAY;
