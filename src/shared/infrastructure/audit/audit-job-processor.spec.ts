import { describe, expect, it, vi } from 'vitest';
import type { AuditJobData } from '@/shared/infrastructure/audit/audit-queue.js';
import { createAuditJobProcessor } from '@/shared/infrastructure/audit/audit-job-processor.js';

const data: AuditJobData = {
  action: 'auth.sign_in.failed',
  outcome: 'FAILURE',
  occurredAt: '2026-09-25T10:00:00.000Z',
  reason: 'INVALID_PHONE_NUMBER_OR_PASSWORD',
};

describe('createAuditJobProcessor', () => {
  const now = new Date('2026-09-25T10:00:03.000Z');

  it('guarda el evento con el id del trabajo y la hora en que lo guarda', async () => {
    const save = vi.fn(() => Promise.resolve());
    const process = createAuditJobProcessor({ save }, () => now);

    await process({ id: 'job-7', data });

    expect(save).toHaveBeenCalledExactlyOnceWith({
      ...data,
      _id: 'job-7',
      occurredAt: new Date(data.occurredAt),
      recordedAt: now,
    });
  });

  it('si guardar falla, el error sube: BullMQ reintenta el trabajo', async () => {
    const save = vi.fn(() => Promise.reject(new Error('MongoDB caído')));
    const process = createAuditJobProcessor({ save }, () => now);

    await expect(process({ id: 'job-7', data })).rejects.toThrow(
      'MongoDB caído',
    );
  });

  it('un trabajo sin identificador es un error: sin él no se puede evitar duplicarlo', async () => {
    const save = vi.fn(() => Promise.resolve());
    const process = createAuditJobProcessor({ save }, () => now);

    await expect(process({ id: undefined, data })).rejects.toThrow(
      'no trae identificador',
    );
    expect(save).not.toHaveBeenCalled();
  });

  it('usa el reloj del sistema cuando no se le da uno', async () => {
    const save = vi.fn(() => Promise.resolve());
    const before = Date.now();

    await createAuditJobProcessor({ save })({ id: 'job-8', data });

    const [document] = save.mock.calls[0] as unknown as [{ recordedAt: Date }];
    expect(document.recordedAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});
