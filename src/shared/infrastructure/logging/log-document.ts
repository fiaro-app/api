import type { LogEntry } from '@/shared/infrastructure/logging/log-entry.js';

/** Una línea de log como se guarda en MongoDB: lo que escribió Pino, con la hora como fecha. */
export interface LogDocument {
  /** El id del lote y la posición de la línea en él: guardar el mismo lote dos veces no duplica nada. */
  readonly _id: string;
  /** Cuándo se escribió; el índice TTL cuenta los 90 días de retención desde aquí. */
  readonly time: Date;
  /** Cuándo llegó a MongoDB, para medir cuánto tarda el lote. */
  readonly recordedAt: Date;
  /** Nivel como texto. */
  readonly level: string;
  /** El resto de los campos de la línea (`msg`, `requestId`, `req`, `res`, `userId`...). */
  readonly [field: string]: unknown;
}

/**
 * Convierte las líneas de un lote en los documentos que se guardan.
 *
 * @param batchId - Identificador del lote (el del trabajo de la cola).
 * @param entries - Las líneas, con la hora como texto.
 * @param recordedAt - Cuándo se guardan.
 */
export function toLogDocuments(
  batchId: string,
  entries: readonly LogEntry[],
  recordedAt: Date,
): LogDocument[] {
  return entries.map((entry, index) => ({
    ...entry,
    _id: `${batchId}:${String(index)}`,
    time: new Date(entry.time),
    recordedAt,
  }));
}
