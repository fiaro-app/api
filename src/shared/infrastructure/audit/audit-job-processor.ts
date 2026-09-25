import type { Job } from 'bullmq';
import type { AuditStore } from '@/shared/infrastructure/audit/mongo-audit-store.js';
import { toAuditDocument } from '@/shared/infrastructure/audit/audit-document.js';
import type { AuditJobData } from '@/shared/infrastructure/audit/audit-queue.js';

/**
 * Lo que hace el consumidor de la cola con cada evento: guardarlo. Si guardar falla, el error sube
 * y BullMQ reintenta el trabajo según `AUDIT_JOB_OPTIONS`.
 *
 * @param store - Dónde se guarda.
 * @param now - Reloj; en las pruebas es fijo.
 * @returns La función que BullMQ llama por cada trabajo.
 */
export function createAuditJobProcessor(
  store: AuditStore,
  now: () => Date = () => new Date(),
) {
  return async (job: Pick<Job<AuditJobData>, 'id' | 'data'>): Promise<void> => {
    if (job.id === undefined) {
      throw new Error('El trabajo de auditoría no trae identificador.');
    }
    await store.save(toAuditDocument(job.id, job.data, now()));
  };
}
