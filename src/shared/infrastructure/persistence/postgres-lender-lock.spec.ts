import { describe, expect, it, vi } from 'vitest';
import { PostgresLenderLock } from '@/shared/infrastructure/persistence/postgres-lender-lock.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

describe('PostgresLenderLock', () => {
  it('toma el candado consultivo del prestamista dentro de una transacción y devuelve lo que hace el trabajo', async () => {
    const executeRaw = vi.fn(() => Promise.resolve(1));
    const transaction = vi.fn(
      (work: (tx: unknown) => Promise<unknown>, options: unknown) => {
        expect(options).toEqual({ timeout: 15_000, maxWait: 15_000 });
        return work({ $executeRaw: executeRaw });
      },
    );
    const lock = new PostgresLenderLock({
      $transaction: transaction,
    } as unknown as PrismaService);

    const result = await lock.runExclusive('lender-1', () =>
      Promise.resolve('hecho'),
    );

    expect(result).toBe('hecho');
    expect(executeRaw).toHaveBeenCalledOnce();
    expect(executeRaw.mock.calls[0]).toContain('lender:lender-1');
  });
});
