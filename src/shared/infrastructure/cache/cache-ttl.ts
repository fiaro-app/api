/**
 * Cuánto viven las entradas de la caché de lecturas, en segundos (D-118). Toda escritura del
 * prestamista las invalida antes; el TTL solo acota lo que puede verse si una invalidación se pierde
 * (Redis caído en ese instante) y lo que cambia con el reloj (la mora de "hoy").
 */
export const CACHE_TTL_SECONDS = {
  /** Resumen y estadísticas: los cálculos más caros. */
  stats: 60,
  /** Listas con saldo y mora. */
  lists: 30,
} as const;
