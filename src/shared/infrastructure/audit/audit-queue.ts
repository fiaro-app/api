import type { JobsOptions, WorkerOptions } from 'bullmq';
import type { AuditEvent } from '@/shared/domain/audit/audit-event.js';

/** Nombre de la cola de auditoría en Redis. */
export const AUDIT_QUEUE_NAME = 'audit';

/** Colección de MongoDB donde se guardan los eventos. */
export const AUDIT_COLLECTION = 'audit_events';

/** Cuánto se conserva un evento en MongoDB: un año. Pasado ese tiempo un índice TTL lo borra. */
export const AUDIT_RETENTION_SECONDS = 365 * 24 * 60 * 60;

/** Un evento tal como viaja por la cola: JSON, así que la fecha es un texto ISO 8601. */
export type AuditJobData = Omit<AuditEvent, 'occurredAt'> & {
  readonly occurredAt: string;
};

/**
 * Cómo se encola cada evento: hasta 6 intentos con espera exponencial desde 2 segundos (unos 62
 * segundos en total, lo que tarda en volver un MongoDB que se reinicia), sin conservar los que
 * terminan bien y con los fallidos una semana (hasta 1000) para revisarlos.
 */
export const AUDIT_JOB_OPTIONS: JobsOptions = {
  attempts: 6,
  backoff: { type: 'exponential', delay: 2_000 },
  removeOnComplete: true,
  removeOnFail: { age: 7 * 24 * 60 * 60, count: 1_000 },
};

/**
 * Cuántos eventos de la cola de eventos de BullMQ (`XADD`) se conservan. El valor por defecto
 * son 10 000: de sobra para un plan de Redis con memoria limitada.
 */
export const AUDIT_EVENTS_STREAM_MAX_LENGTH = 100;

/**
 * Cómo trabaja quien consume la cola. BullMQ consulta Redis aunque no haya trabajo, y un Redis
 * de pago por comando (Upstash) lo cobra: `drainDelay` alarga la espera bloqueante cuando la cola
 * está vacía y `stalledInterval` la revisión de trabajos atascados. `lockDuration` da un minuto
 * a cada evento antes de darlo por perdido.
 */
export const AUDIT_WORKER_OPTIONS = {
  concurrency: 5,
  drainDelay: 60,
  stalledInterval: 300_000,
  lockDuration: 60_000,
  maxStalledCount: 1,
} satisfies Partial<WorkerOptions>;
