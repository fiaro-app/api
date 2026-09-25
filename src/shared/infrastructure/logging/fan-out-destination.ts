import type { DestinationStream } from 'pino';

/**
 * Un destino de logs que entrega cada línea a otros dos: el principal (la salida estándar, la copia
 * que siempre está) y una copia secundaria (el lote que va a MongoDB).
 *
 * @remarks
 * La línea llega primero al principal: lo que pase con la copia secundaria no puede retrasar ni
 * impedir el log. Por eso quien recibe la copia no debe lanzar errores en `write`.
 *
 * @param primary - Destino principal.
 * @param secondary - Copia secundaria.
 */
export function fanOutDestination(
  primary: DestinationStream,
  secondary: DestinationStream,
): DestinationStream {
  return {
    write(line: string): void {
      primary.write(line);
      secondary.write(line);
    },
  };
}
