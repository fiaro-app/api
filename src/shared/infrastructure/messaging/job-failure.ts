import type { Job } from 'bullmq';

/** Qué se escribe en el log cuando un trabajo de la cola no se pudo guardar, y con qué nivel. */
export interface JobFailureLog {
  /** `warn` mientras BullMQ va a reintentar; `error` cuando ya no quedan intentos. */
  readonly level: 'warn' | 'error';
  /** El mensaje, sin datos personales: solo el nombre del trabajo, los intentos y el motivo. */
  readonly message: string;
}

/**
 * Describe el fallo de un intento de guardar un trabajo de la cola de registros (un evento de
 * auditoría o un lote de líneas de log).
 *
 * @remarks
 * Un intento fallido con intentos por delante es un aviso: BullMQ reintenta. Cuando el último
 * falla (o el trabajo ya no existe) el registro no llegó a MongoDB y solo quedó en el log, así que
 * se escribe como error.
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
      message: `Un trabajo de la cola de registros falló y ya no existe: ${error.message}.`,
    };
  }
  const attempts = job.opts.attempts ?? 1;
  const last = job.attemptsMade >= attempts;
  return {
    level: last ? 'error' : 'warn',
    message: `No se pudo guardar el trabajo ${job.name} (intento ${String(job.attemptsMade)} de ${String(attempts)}${last ? ', ya no se reintenta: solo queda en el log' : ''}): ${error.message}.`,
  };
}
