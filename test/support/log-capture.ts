import type { DestinationStream } from 'pino';

/** Un registro del log ya leído: una línea de JSON de Pino. */
export type LogEntry = Record<string, unknown> & { level: string };

/**
 * Un destino de logs que guarda lo que Pino escribe, para inspeccionarlo en las pruebas.
 */
export function captureLogs() {
  const lines: string[] = [];
  const destination: DestinationStream = {
    write(line: string) {
      lines.push(line);
    },
  };
  return {
    destination,
    /** Cada línea escrita, leída como JSON. */
    entries: (): LogEntry[] =>
      lines.map((line) => JSON.parse(line) as LogEntry),
    /** Todo lo escrito, como un solo texto. */
    text: (): string => lines.join(''),
  };
}
