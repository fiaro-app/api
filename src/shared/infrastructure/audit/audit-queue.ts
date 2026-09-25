import type { JobsOptions } from 'bullmq';
import type { AuditEvent } from '@/shared/domain/audit/audit-event.js';

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
