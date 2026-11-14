import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GetLoanBalanceUseCase } from '@/modules/collections/application/use-cases/get-loan-balance.use-case.js';
import { SendMoraAlertsUseCase } from '@/modules/alerts/application/use-cases/send-mora-alerts.use-case.js';
import type { ListLenderIdsWithActiveLoansUseCase } from '@/modules/loans/application/use-cases/list-lender-ids-with-active-loans.use-case.js';
import type { ListLoansUseCase } from '@/modules/loans/application/use-cases/list-loans.use-case.js';
import type { ListActiveMembershipsByRolesUseCase } from '@/modules/memberships/application/use-cases/list-active-memberships-by-roles.use-case.js';
import type { CreateNotificationUseCase } from '@/modules/notifications/application/use-cases/create-notification.use-case.js';

interface Scenario {
  /** Prestamistas con préstamos activos. */
  readonly lenders: readonly string[];
  /** Préstamos activos de cada prestamista, en el orden en que se piden. */
  readonly loanIds: Readonly<Record<string, readonly string[]>>;
  /** Saldo vencido de cada préstamo; los que no aparecen están al día. */
  readonly overdue?: Readonly<Record<string, number>>;
  /** Un prestamista para el que el cálculo falla. */
  readonly failingLender?: string;
  /** Un prestamista para el que falla el aviso a sus administradores. */
  readonly failingNotification?: string;
}

function setup(scenario: Scenario) {
  const overdue = scenario.overdue ?? {};
  const listLenderIdsExecute = vi.fn(() => Promise.resolve(scenario.lenders));
  const listLoansExecute = vi.fn(
    ({
      lenderId,
      page,
      pageSize,
    }: {
      lenderId: string;
      page: number;
      pageSize: number;
    }) => {
      if (lenderId === scenario.failingLender) {
        return Promise.reject(new Error('base de datos caída'));
      }
      const ids = scenario.loanIds[lenderId] ?? [];
      const items = ids
        .slice((page - 1) * pageSize, page * pageSize)
        .map((id) => ({ id }));
      return Promise.resolve({ items, total: ids.length });
    },
  );
  const getLoanBalanceExecute = vi.fn((loanId: string) =>
    Promise.resolve({ overdueAmount: overdue[loanId] ?? 0 }),
  );
  const listReviewersExecute = vi.fn((lenderId: string) => {
    if (lenderId === scenario.failingNotification) {
      return Promise.reject(new Error('membresías caídas'));
    }
    return Promise.resolve([{ userId: 'owner-1' }, { userId: 'lender-2' }]);
  });
  const createNotificationExecute = vi.fn(() => Promise.resolve({}));

  const useCase = new SendMoraAlertsUseCase(
    {
      execute: listLenderIdsExecute,
    } as unknown as ListLenderIdsWithActiveLoansUseCase,
    { execute: listLoansExecute } as unknown as ListLoansUseCase,
    { execute: getLoanBalanceExecute } as unknown as GetLoanBalanceUseCase,
    {
      execute: listReviewersExecute,
    } as unknown as ListActiveMembershipsByRolesUseCase,
    {
      execute: createNotificationExecute,
    } as unknown as CreateNotificationUseCase,
  );
  return {
    useCase,
    listLoansExecute,
    getLoanBalanceExecute,
    createNotificationExecute,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SendMoraAlertsUseCase', () => {
  it('sin prestamistas con préstamos activos, no avisa a nadie', async () => {
    const { useCase, createNotificationExecute } = setup({
      lenders: [],
      loanIds: {},
    });

    await expect(useCase.execute()).resolves.toEqual({
      lendersNotified: 0,
      loansInMora: 0,
    });
    expect(createNotificationExecute).not.toHaveBeenCalled();
  });

  it('un prestamista sin préstamos en mora no recibe aviso', async () => {
    const { useCase, createNotificationExecute } = setup({
      lenders: ['lender-1'],
      loanIds: { 'lender-1': ['loan-1'] },
    });

    await expect(useCase.execute()).resolves.toEqual({
      lendersNotified: 0,
      loansInMora: 0,
    });
    expect(createNotificationExecute).not.toHaveBeenCalled();
  });

  it('avisa a quien administra el prestamista cuando tiene préstamos en mora', async () => {
    const { useCase, createNotificationExecute } = setup({
      lenders: ['lender-1'],
      loanIds: { 'lender-1': ['loan-1', 'loan-2'] },
      overdue: { 'loan-1': 20_000 },
    });

    await expect(useCase.execute()).resolves.toEqual({
      lendersNotified: 1,
      loansInMora: 1,
    });
    expect(createNotificationExecute.mock.calls).toEqual([
      [
        {
          recipientUserId: 'owner-1',
          lenderId: 'lender-1',
          severity: 'INFO',
          title: 'Préstamos en mora',
          body: 'Hoy tienes 1 préstamo en mora por $ 20.000 en total.',
          relatedEntityType: null,
          relatedEntityId: null,
        },
      ],
      [
        expect.objectContaining({
          recipientUserId: 'lender-2',
          lenderId: 'lender-1',
        }),
      ],
    ]);
  });

  it('recorre todas las páginas de los préstamos activos', async () => {
    const ids = Array.from(
      { length: 150 },
      (_, index) => `loan-${String(index + 1)}`,
    );
    const { useCase, listLoansExecute, getLoanBalanceExecute } = setup({
      lenders: ['lender-1'],
      loanIds: { 'lender-1': ids },
    });

    await useCase.execute();

    expect(listLoansExecute.mock.calls.map(([input]) => input)).toEqual([
      { lenderId: 'lender-1', status: 'ACTIVE', page: 1, pageSize: 100 },
      { lenderId: 'lender-1', status: 'ACTIVE', page: 2, pageSize: 100 },
    ]);
    expect(getLoanBalanceExecute).toHaveBeenCalledTimes(150);
  });

  it('con un solo préstamo, no pide una segunda página', async () => {
    const { useCase, listLoansExecute } = setup({
      lenders: ['lender-1'],
      loanIds: { 'lender-1': ['loan-1'] },
    });

    await useCase.execute();

    expect(listLoansExecute).toHaveBeenCalledTimes(1);
  });

  it('si el cálculo de un prestamista falla, lo registra y sigue con los demás', async () => {
    const logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const { useCase } = setup({
      lenders: ['lender-roto', 'lender-1'],
      loanIds: { 'lender-1': ['loan-1'] },
      overdue: { 'loan-1': 5_000 },
      failingLender: 'lender-roto',
    });

    await expect(useCase.execute()).resolves.toEqual({
      lendersNotified: 1,
      loansInMora: 1,
    });
    expect(logError).toHaveBeenCalledWith(
      'No se pudo calcular la mora del prestamista lender-roto: Error: base de datos caída.',
    );
  });

  it('si el aviso falla, el prestamista no cuenta como avisado, pero su mora sí se contó', async () => {
    const logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const { useCase } = setup({
      lenders: ['lender-1'],
      loanIds: { 'lender-1': ['loan-1'] },
      overdue: { 'loan-1': 5_000 },
      failingNotification: 'lender-1',
    });

    await expect(useCase.execute()).resolves.toEqual({
      lendersNotified: 0,
      loansInMora: 1,
    });
    expect(logError).toHaveBeenCalledWith(
      'No se pudo avisar al prestamista lender-1: Error: membresías caídas.',
    );
  });
});
