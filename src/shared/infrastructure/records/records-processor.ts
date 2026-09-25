import type { Db } from 'mongodb';
import type { AuditDocument } from '@/shared/infrastructure/audit/audit-document.js';
import { createAuditJobProcessor } from '@/shared/infrastructure/audit/audit-job-processor.js';
import { AUDIT_COLLECTION } from '@/shared/infrastructure/audit/audit-queue.js';
import { MongoAuditStore } from '@/shared/infrastructure/audit/mongo-audit-store.js';
import type { JobProcessor } from '@/shared/infrastructure/messaging/records-pipeline.js';

/**
 * Arma lo que hace el consumidor de la cola de registros con cada trabajo.
 *
 * @param database - La base de datos de MongoDB donde se guarda todo.
 * @returns El procesador de trabajos.
 */
export function createRecordsProcessor(database: Db): JobProcessor {
  return createAuditJobProcessor(
    new MongoAuditStore(database.collection<AuditDocument>(AUDIT_COLLECTION)),
  );
}
