import type { Db } from 'mongodb';
import type { AuditDocument } from '@/shared/infrastructure/audit/audit-document.js';
import { createAuditJobProcessor } from '@/shared/infrastructure/audit/audit-job-processor.js';
import { AUDIT_COLLECTION } from '@/shared/infrastructure/audit/audit-queue.js';
import { MongoAuditStore } from '@/shared/infrastructure/audit/mongo-audit-store.js';
import {
  LOG_BATCH_JOB_NAME,
  LOG_COLLECTION,
} from '@/shared/infrastructure/logging/log-batch.js';
import { createLogBatchProcessor } from '@/shared/infrastructure/logging/log-batch-processor.js';
import type { LogDocument } from '@/shared/infrastructure/logging/log-document.js';
import { MongoLogStore } from '@/shared/infrastructure/logging/mongo-log-store.js';
import type { JobProcessor } from '@/shared/infrastructure/messaging/records-pipeline.js';

/**
 * Arma lo que hace el consumidor de la cola de registros con cada trabajo: el lote de líneas de log
 * (`LOG_BATCH_JOB_NAME`) va a su colección y cualquier otro trabajo es un evento de auditoría, que
 * lleva su acción como nombre.
 *
 * @param database - La base de datos de MongoDB donde se guarda todo.
 * @returns El procesador de trabajos.
 */
export function createRecordsProcessor(database: Db): JobProcessor {
  const audit = createAuditJobProcessor(
    new MongoAuditStore(database.collection<AuditDocument>(AUDIT_COLLECTION)),
  );
  const logs = createLogBatchProcessor(
    new MongoLogStore(database.collection<LogDocument>(LOG_COLLECTION)),
  );
  return (job) => (job.name === LOG_BATCH_JOB_NAME ? logs(job) : audit(job));
}
