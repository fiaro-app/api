import { describe, expect, it, vi } from 'vitest';
import type { LeadNotifier } from '@/modules/leads/application/services/lead-notifier.js';
import { CreateLeadUseCase } from '@/modules/leads/application/use-cases/create-lead.use-case.js';
import type { Lead } from '@/modules/leads/domain/entities/lead.entity.js';
import { InvalidLeadDataError } from '@/modules/leads/domain/errors/invalid-lead-data.error.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';

const NOW = new Date('2026-10-09T12:00:00Z');

function setup() {
  const saved: Lead[] = [];
  const create = vi.fn((lead: Lead) => {
    saved.push(lead);
    return Promise.resolve();
  });
  const notify = vi.fn();
  const ids: IdGenerator = { next: () => 'lead-1' };
  const clock: Clock = { now: () => NOW };
  const useCase = new CreateLeadUseCase(
    { create },
    { notify } as unknown as LeadNotifier,
    ids,
    clock,
  );
  return { useCase, create, notify, saved };
}

const INPUT = {
  name: ' Ana Pérez ',
  phone: '300 123 4567',
  message: 'Quiero probar Fiaro.',
};

describe('CreateLeadUseCase', () => {
  it('guarda el contacto con los datos normalizados y avisa a ventas', async () => {
    const { useCase, saved, notify } = setup();

    await useCase.execute(INPUT);

    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      id: 'lead-1',
      name: 'Ana Pérez',
      phone: '+573001234567',
      email: null,
      createdAt: NOW,
    });
    expect(notify).toHaveBeenCalledExactlyOnceWith(saved[0]);
  });

  it('con datos inválidos no guarda nada ni avisa', async () => {
    const { useCase, create, notify } = setup();

    await expect(
      useCase.execute({ name: 'A', message: 'Hola' }),
    ).rejects.toBeInstanceOf(InvalidLeadDataError);
    expect(create).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it('si guardar falla, no avisa a ventas de algo que no quedó guardado', async () => {
    const { useCase, create, notify } = setup();
    create.mockRejectedValueOnce(new Error('base de datos caída'));

    await expect(useCase.execute(INPUT)).rejects.toThrow('base de datos caída');
    expect(notify).not.toHaveBeenCalled();
  });
});
