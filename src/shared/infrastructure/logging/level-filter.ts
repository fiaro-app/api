import pino, { type DestinationStream, type Level } from 'pino';

/**
 * El nivel con el que empieza una línea de Pino. `createLogger` escribe el nivel como texto
 * (`formatters.level`) y Pino lo pone siempre primero: `{"level":"warn","time":...`.
 */
const LEVEL_OF_LINE = /^\{"level":"([a-z]+)"/;

/**
 * Los nombres de los niveles de Pino desde `minimum` hacia arriba (`warn`, `error` y `fatal`, para
 * `warn`). Un nivel que Pino no conoce no deja pasar ninguno.
 */
function levelsFrom(minimum: Level): ReadonlySet<string> {
  const levels = Object.entries(pino.levels.values);
  const floor =
    levels.find(([label]) => label === minimum)?.[1] ??
    Number.POSITIVE_INFINITY;
  return new Set(
    levels.filter(([, value]) => value >= floor).map(([label]) => label),
  );
}

/**
 * Un destino de logs que solo deja pasar las líneas del nivel indicado hacia arriba.
 *
 * @remarks
 * Lee el nivel del comienzo de la línea, sin interpretar el JSON: se ejecuta con cada línea que
 * escribe la aplicación. Una línea que no empieza así (no es de Pino) no pasa. No se usa
 * `pino.multistream` con niveles por destino porque Pino los descarta en los loggers hijos
 * (`logger.child`, que es lo que usa pino-http para cada petición): el filtro dejaría de aplicar
 * justo a la línea de cada petición.
 *
 * @param destination - A donde pasan las líneas que cumplen.
 * @param minimum - El nivel más bajo que pasa.
 */
export function onlyFromLevel(
  destination: DestinationStream,
  minimum: Level,
): DestinationStream {
  const accepted = levelsFrom(minimum);
  return {
    write(line: string): void {
      const level = LEVEL_OF_LINE.exec(line)?.[1];
      if (level !== undefined && accepted.has(level)) {
        destination.write(line);
      }
    },
  };
}
