import type { Job } from 'bullmq';

/** Qué se escribe en el log cuando un evento no se pudo guardar, y con qué nivel. */
export interface JobFailureLog {
  /** `warn` mientras BullMQ va a reintentar; `error` cuando ya no quedan intentos. */
  readonly level: 'warn' | 'error';
  /** El mensaje, sin datos personales: solo la acción, los intentos y el motivo. */
  readonly message: string;
}

/**
 * Describe el fallo de un intento de guardar un evento de auditoría.
 *
 * @remarks
 * Un intento fallido con intentos por delante es un aviso: BullMQ reintenta. Cuando el último
 * falla (o el trabajo ya no existe) el evento no llegó a MongoDB y solo quedó en el log de
 * auditoría, así que se escribe como error.
 *
 * @param job - El trabajo que falló; `undefined` si BullMQ ya lo había borrado.
 * @param error - Por qué falló.
 */
export function describeFailedJob(
  job: Pick<Job, 'name' | 'attemptsMade' | 'opts'> | undefined,
  error: Error,
): JobFailureLog {
  if (job === undefined) {
    return {
      level: 'error',
      message: `Un evento de auditoría falló y su trabajo ya no existe: ${error.message}.`,
    };
  }
  const attempts = job.opts.attempts ?? 1;
  const last = job.attemptsMade >= attempts;
  return {
    level: last ? 'error' : 'warn',
    message: `No se pudo guardar el evento ${job.name} (intento ${String(job.attemptsMade)} de ${String(attempts)}${last ? ', ya no se reintenta: solo queda en el log' : ''}): ${error.message}.`,
  };
}
