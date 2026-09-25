/** Una línea del log ya leída: el JSON que escribió Pino, con su hora y su nivel. */
export type LogEntry = Record<string, unknown> & {
  /** Cuándo se escribió, en ISO 8601. */
  readonly time: string;
  /** Nivel como texto (`info`, `warn`, `error`...). */
  readonly level: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLogEntry(value: unknown): value is LogEntry {
  return (
    isRecord(value) &&
    typeof value.level === 'string' &&
    typeof value.time === 'string' &&
    !Number.isNaN(Date.parse(value.time))
  );
}

function parseLogLine(line: string): LogEntry | undefined {
  try {
    const parsed: unknown = JSON.parse(line);
    return isLogEntry(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Lee las líneas que escribió Pino y deja las que se guardan en MongoDB.
 *
 * @remarks
 * Se descarta lo que no es una línea de log (JSON roto, sin hora o sin nivel) y los eventos de
 * auditoría (`audit: true`), que ya tienen su propia colección y su propio ciclo de vida: guardarlos
 * también aquí duplicaría datos personales con otra retención.
 *
 * @param lines - Las líneas tal como las escribió Pino, una por elemento.
 * @returns Las líneas que se guardan, en el mismo orden.
 */
export function toLogEntries(lines: readonly string[]): LogEntry[] {
  return lines.flatMap((line) => {
    const entry = parseLogLine(line);
    return entry === undefined || entry.audit === true ? [] : [entry];
  });
}
