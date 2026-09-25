import type { Job } from 'bullmq';
import type { LogBatchJobData } from '@/shared/infrastructure/logging/log-batch.js';
import { toLogDocuments } from '@/shared/infrastructure/logging/log-document.js';
import type { LogStore } from '@/shared/infrastructure/logging/mongo-log-store.js';

/**
 * Lo que hace el consumidor de la cola con cada lote de líneas de log: guardarlo. Si guardar falla,
 * el error sube y BullMQ reintenta el trabajo según `LOG_BATCH_JOB_OPTIONS`.
 *
 * @param store - Dónde se guardan las líneas.
 * @param now - Reloj; en las pruebas es fijo.
 * @returns La función que se llama por cada lote.
 */
export function createLogBatchProcessor(
  store: LogStore,
  now: () => Date = () => new Date(),
) {
  return async (
    job: Pick<Job<LogBatchJobData>, 'id' | 'data'>,
  ): Promise<void> => {
    if (job.id === undefined) {
      throw new Error('El lote de líneas de log no trae identificador.');
    }
    await store.save(toLogDocuments(job.id, job.data.entries, now()));
  };
}
