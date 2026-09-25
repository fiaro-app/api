import type { JobsOptions } from 'bullmq';
import type { LogEntry } from '@/shared/infrastructure/logging/log-entry.js';

/** Nombre del trabajo de la cola de registros que lleva un lote de líneas de log a MongoDB. */
export const LOG_BATCH_JOB_NAME = 'logs.batch';

/** Colección de MongoDB donde se guardan las líneas de log. */
export const LOG_COLLECTION = 'logs';

/** Cuánto se conserva una línea en MongoDB: 90 días. Pasado ese tiempo un índice TTL la borra. */
export const LOG_RETENTION_SECONDS = 90 * 24 * 60 * 60;

/** Lo que viaja por la cola: las líneas de un lote, ya leídas (la hora sigue siendo un texto ISO 8601). */
export interface LogBatchJobData {
  readonly entries: readonly LogEntry[];
}

/**
 * Cómo se encola cada lote: hasta 5 intentos con espera exponencial desde 5 segundos (unos 75
 * segundos en total) y sin conservar los que terminan bien. Los fallidos se guardan un día (hasta
 * 20): son de los trabajos más pesados de la cola y Redis tiene poca memoria. Un lote que no llega
 * a MongoDB solo queda en la salida estándar, donde siempre está.
 */
export const LOG_BATCH_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: true,
  removeOnFail: { age: 24 * 60 * 60, count: 20 },
};

/** Cuándo se envía un lote y cuánto se guarda en memoria mientras tanto. */
export interface LogBatchLimits {
  /** Cuánto se espera, desde la primera línea guardada, antes de enviar el lote. */
  readonly intervalMs: number;
  /** Con tantas líneas guardadas el lote se envía sin esperar el intervalo. */
  readonly maxLines: number;
  /** Con tantos caracteres guardados el lote se envía sin esperar el intervalo. */
  readonly maxBytes: number;
  /** Cuántos lotes pueden estar esperando a Redis a la vez; el siguiente se descarta. */
  readonly maxInFlight: number;
  /** Una línea más larga que esto no se guarda en MongoDB (sigue en la salida estándar). */
  readonly maxLineLength: number;
}

/**
 * Los límites de los lotes. Cada lote es un trabajo de la cola y Redis de pago por comando (Upstash)
 * cobra cada uno (unos 6 comandos), así que se envía cada 5 minutos como mucho una vez: unos 52 mil
 * comandos al mes. El tamaño (1000 líneas, 512 KB) mantiene cada trabajo muy por debajo del
 * megabyte que admite una petición del plan gratuito.
 */
export const LOG_BATCH_LIMITS: LogBatchLimits = {
  intervalMs: 5 * 60_000,
  maxLines: 1_000,
  maxBytes: 512 * 1024,
  maxInFlight: 3,
  maxLineLength: 16 * 1024,
};
