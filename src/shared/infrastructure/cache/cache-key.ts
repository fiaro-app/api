import { createHash } from 'node:crypto';

/** Copia de `value` con las claves de cada objeto en orden, para que `{a,b}` y `{b,a}` den la misma clave. */
function sorted(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sorted);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, entry]) => [name, sorted(entry)]),
    );
  }
  return value;
}

/**
 * Clave de caché de una lectura: el recurso y un resumen de sus parámetros (filtros, orden,
 * paginación y, si aplica, quién pregunta). El orden de las propiedades y los `undefined` no
 * cambian la clave.
 *
 * @param resource - Qué se lee, por ejemplo `stats` o `loans`.
 * @param params - Los datos que cambian el resultado.
 */
export function cacheKey(resource: string, params: object = {}): string {
  const digest = createHash('sha256')
    .update(JSON.stringify(sorted(params)))
    .digest('base64url')
    .slice(0, 22);
  return `${resource}:${digest}`;
}
