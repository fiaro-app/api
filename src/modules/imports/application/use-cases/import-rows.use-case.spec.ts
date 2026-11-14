import { describe, expect, it, vi } from 'vitest';
import { ImportRowsUseCase } from '@/modules/imports/application/use-cases/import-rows.use-case.js';
import type { ImportRowInput } from '@/modules/imports/domain/import-row.js';

const row = (nationalId: string, withLoan = true): ImportRowInput => ({
  nationalId,
  fullName: 'María Pérez',
  occupation: 'Tendera',
  phone: '3001234567',
  address: 'Calle 1 # 2-3',
  loan: withLoan
    ? {
        remainingInstallments: 5,
        installmentValue: 10_000,
        frequency: 'DAILY',
        nextInstallmentDate: '2026-11-03',
      }
    : null,
});

function setup(options: { loanFails?: Error } = {}) {
  const lookups = {
    existingClients: vi.fn(() => Promise.resolve(new Map<string, string>())),
    activeCollectors: vi.fn(() => Promise.resolve(new Map<string, string>())),
  };
  const createClient = {
    execute: vi.fn(() => Promise.resolve({ id: 'client-1' })),
  };
  const createLoan = {
    execute: vi.fn(() =>
      options.loanFails === undefined
        ? Promise.resolve({ id: 'loan-1' })
        : Promise.reject(options.loanFails),
    ),
  };
  const createAssignment = { execute: vi.fn(() => Promise.resolve({})) };
  const audit = { record: vi.fn() };
  const useCase = new ImportRowsUseCase(
    lookups,
    createClient as never,
    createLoan as never,
    createAssignment as never,
    { now: () => new Date('2026-10-21T00:00:00Z') },
    audit,
  );
  return { useCase, createClient, createLoan, audit, lookups };
}

const INPUT = { lenderId: 'lender-1', membershipId: 'm-1' };

describe('ImportRowsUseCase', () => {
  it('la vista previa no crea ni audita', async () => {
    const { useCase, createClient, audit } = setup();

    const outcome = await useCase.execute({
      ...INPUT,
      dryRun: true,
      rows: [row('1020304050'), row('1020304050', false), row('1', false)],
    });

    expect(outcome.summary).toMatchObject({
      ok: 2,
      invalid: 1,
      newClients: 1,
      loans: 1,
    });
    expect(createClient.execute).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('confirmar crea una vez al cliente repetido y audita con éxito', async () => {
    const { useCase, createClient, createLoan, audit } = setup();

    const outcome = await useCase.execute({
      ...INPUT,
      dryRun: false,
      rows: [row('1020304050'), row('1020304050')],
    });

    expect(createClient.execute).toHaveBeenCalledOnce();
    expect(createLoan.execute).toHaveBeenCalledTimes(2);
    expect(outcome.summary).toMatchObject({ ok: 2, failed: 0 });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'imports.batch.completed',
        outcome: 'SUCCESS',
      }),
    );
  });

  it('una fila que falla se reporta aparte y la auditoría queda en FAILURE', async () => {
    const { useCase, audit } = setup({ loanFails: new Error('db caída') });

    const outcome = await useCase.execute({
      ...INPUT,
      dryRun: false,
      rows: [row('1020304050'), row('1', false)],
    });

    expect(outcome.rows[0]).toMatchObject({ status: 'FAILED', client: 'NEW' });
    expect(outcome.rows[1]?.status).toBe('INVALID');
    expect(outcome.summary).toMatchObject({
      failed: 1,
      invalid: 1,
      newClients: 0,
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'FAILURE' }),
    );
  });

  it('si falla antes de crear al cliente, la fila no cuenta cliente nuevo', async () => {
    const { useCase, createClient } = setup();
    createClient.execute.mockRejectedValueOnce(new Error('db caída'));

    const outcome = await useCase.execute({
      ...INPUT,
      dryRun: false,
      rows: [row('1020304050')],
    });

    expect(outcome.rows[0]).toMatchObject({ status: 'FAILED', client: null });
  });
});
