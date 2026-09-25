import type { Job } from 'bullmq';
import { describe, expect, it, vi } from 'vitest';
import { AUDIT_COLLECTION } from '@/shared/infrastructure/audit/audit-queue.js';
import {
  LOG_BATCH_JOB_NAME,
  LOG_COLLECTION,
} from '@/shared/infrastructure/logging/log-batch.js';
import { createRecordsProcessor } from '@/shared/infrastructure/records/records-processor.js';

function setup() {
  const audit = {
    createIndexes: vi.fn(() => Promise.resolve([])),
    updateOne: vi.fn(() => Promise.resolve({})),
  };
  const logs = {
    createIndexes: vi.fn(() => Promise.resolve([])),
    insertMany: vi.fn(() => Promise.resolve({})),
  };
  const collections: Record<string, unknown> = {
    [AUDIT_COLLECTION]: audit,
    [LOG_COLLECTION]: logs,
  };
  const process = createRecordsProcessor({
    collection: (name: string) => collections[name],
  } as never);
  return { process, audit, logs };
}

const job = (fields: Record<string, unknown>) => fields as unknown as Job;

describe('createRecordsProcessor', () => {
  it('un lote de líneas de log va a la colección de logs', async () => {
    const { process, audit, logs } = setup();

    await process(
      job({
        id: 'lote-1',
        name: LOG_BATCH_JOB_NAME,
        data: {
          entries: [
            { level: 'info', time: '2026-09-25T10:00:00.000Z', msg: 'una' },
          ],
        },
      }),
    );

    expect(logs.insertMany).toHaveBeenCalledOnce();
    expect(audit.updateOne).not.toHaveBeenCalled();
  });

  it('cualquier otro trabajo es un evento de auditoría y va a su colección', async () => {
    const { process, audit, logs } = setup();

    await process(
      job({
        id: 'evt-1',
        name: 'auth.sign_in.succeeded',
        data: {
          action: 'auth.sign_in.succeeded',
          outcome: 'SUCCESS',
          occurredAt: '2026-09-25T10:00:00.000Z',
        },
      }),
    );

    expect(audit.updateOne).toHaveBeenCalledOnce();
    expect(logs.insertMany).not.toHaveBeenCalled();
  });
});
