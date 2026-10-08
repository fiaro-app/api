import { describe, expect, it, vi } from 'vitest';
import { PrismaMoraAlertRunRepository } from '@/modules/alerts/infrastructure/persistence/prisma-mora-alert-run.repository.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

const NOW = new Date('2026-10-06T13:00:05.000Z');

function setup(created: number) {
  const createMany = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve({ count: created }),
  );
  const update = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve({}),
  );
  const repository = new PrismaMoraAlertRunRepository(
    { moraAlertRun: { createMany, update } } as unknown as PrismaService,
    { now: () => NOW },
  );
  return { repository, createMany, update };
}

describe('PrismaMoraAlertRunRepository', () => {
  it('reclama el día: es suyo solo si la inserción creó la fila', async () => {
    const { repository, createMany } = setup(1);

    await expect(repository.claim('2026-10-06')).resolves.toBe(true);

    expect(createMany).toHaveBeenCalledWith({
      data: [{ businessDate: new Date('2026-10-06T00:00:00.000Z') }],
      skipDuplicates: true,
    });
  });

  it('si el día ya estaba reclamado, no es suyo', async () => {
    const { repository } = setup(0);

    await expect(repository.claim('2026-10-06')).resolves.toBe(false);
  });

  it('anota cómo terminó el envío del día, con la hora del reloj', async () => {
    const { repository, update } = setup(1);

    await repository.finish('2026-10-06', {
      lendersNotified: 2,
      loansInMora: 3,
    });

    expect(update).toHaveBeenCalledWith({
      where: { businessDate: new Date('2026-10-06T00:00:00.000Z') },
      data: { finishedAt: NOW, lendersNotified: 2, loansInMora: 3 },
    });
  });
});
