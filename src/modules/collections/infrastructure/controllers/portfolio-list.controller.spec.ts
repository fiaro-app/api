import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it, vi } from 'vitest';
import type { ListClientsWithBalanceUseCase } from '@/modules/collections/application/use-cases/list-clients-with-balance.use-case.js';
import type { ListLoansWithBalanceUseCase } from '@/modules/collections/application/use-cases/list-loans-with-balance.use-case.js';
import { PortfolioListController } from '@/modules/collections/infrastructure/controllers/portfolio-list.controller.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';

const LOAN_PAGE = {
  total: 1,
  items: [
    {
      loan: {
        id: 'loan-1',
        clientId: 'client-1',
        principalAmount: 500_000,
        installmentCount: 20,
        installmentValue: 30_000,
        totalPayable: 600_000,
        frequency: 'DAILY' as const,
        startDate: '2026-10-01',
        status: 'ACTIVE' as const,
        createdByMembershipId: 'membership-1',
        createdAt: new Date('2026-10-01T00:00:00Z'),
        closedAt: null,
      },
      balance: 570_000,
      overdueAmount: 30_000,
      overdueDays: 2,
      nextDueDate: '2026-10-02',
      collector: { membershipId: 'membership-2', fullName: 'Ana Cobradora' },
    },
  ],
};

const CLIENT_PAGE = {
  total: 1,
  items: [
    {
      client: {
        id: 'client-1',
        nationalId: '1020304050',
        fullName: 'Carlos Gómez',
        occupation: 'Vendedor',
        phone: '+573001234567',
        address: 'Calle 45',
        createdAt: new Date('2026-09-30T00:00:00Z'),
      },
      balance: 570_000,
      overdueAmount: 30_000,
      overdueDays: 2,
      activeLoans: 1,
    },
  ],
};

function setup() {
  const listLoans = { execute: vi.fn(() => Promise.resolve(LOAN_PAGE)) };
  const listClients = { execute: vi.fn(() => Promise.resolve(CLIENT_PAGE)) };
  const controller = new PortfolioListController(
    listLoans as unknown as ListLoansWithBalanceUseCase,
    listClients as unknown as ListClientsWithBalanceUseCase,
  );
  return { controller, listLoans, listClients };
}

const SCOPE: LenderScope = {
  membershipId: 'membership-1',
  lenderId: 'lender-1',
  roles: ['COLLECTOR'],
};

function routeOf(name: 'listLoans' | 'listClients') {
  const handler = Reflect.get(
    PortfolioListController.prototype,
    name,
  ) as object;
  return {
    method:
      RequestMethod[
        Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod
      ],
    path: Reflect.getMetadata(PATH_METADATA, handler) as string,
  };
}

describe('PortfolioListController', () => {
  it('publica QUERY /loans y QUERY /clients', () => {
    expect(routeOf('listLoans')).toEqual({ method: 'QUERY', path: 'loans' });
    expect(routeOf('listClients')).toEqual({
      method: 'QUERY',
      path: 'clients',
    });
  });

  describe('listLoans', () => {
    it('devuelve la página con el saldo, la mora y el cobrador, para cualquier rol', async () => {
      const { controller, listLoans } = setup();

      const response = await controller.listLoans(
        { page: 1, pageSize: 20, status: 'ACTIVE' },
        SCOPE,
      );

      expect(listLoans.execute).toHaveBeenCalledExactlyOnceWith({
        lenderId: 'lender-1',
        page: 1,
        pageSize: 20,
        status: 'ACTIVE',
      });
      expect(response.meta).toEqual({ page: 1, pageSize: 20, total: 1 });
      expect(response.data[0]).toMatchObject({
        id: 'loan-1',
        createdAt: '2026-10-01T00:00:00.000Z',
        closedAt: null,
        balance: 570_000,
        overdueAmount: 30_000,
        overdueDays: 2,
        nextDueDate: '2026-10-02',
        collector: { membershipId: 'membership-2', fullName: 'Ana Cobradora' },
      });
    });

    it('un préstamo sin cobrador sale con collector null', async () => {
      const { controller, listLoans } = setup();
      listLoans.execute.mockResolvedValueOnce({
        total: 1,
        items: LOAN_PAGE.items.map((item) => ({ ...item, collector: null })),
      } as never);

      const response = await controller.listLoans(
        { page: 1, pageSize: 20 },
        SCOPE,
      );

      expect(response.data[0]?.collector).toBeNull();
    });
  });

  describe('listClients', () => {
    it('devuelve la página con lo que debe y lo que tiene vencido cada cliente', async () => {
      const { controller, listClients } = setup();

      const response = await controller.listClients(
        { page: 1, pageSize: 20, search: 'Gómez' },
        SCOPE,
      );

      expect(listClients.execute).toHaveBeenCalledExactlyOnceWith({
        lenderId: 'lender-1',
        page: 1,
        pageSize: 20,
        search: 'Gómez',
      });
      expect(response).toEqual({
        data: [
          {
            id: 'client-1',
            nationalId: '1020304050',
            fullName: 'Carlos Gómez',
            occupation: 'Vendedor',
            phone: '+573001234567',
            address: 'Calle 45',
            createdAt: '2026-09-30T00:00:00.000Z',
            balance: 570_000,
            overdueAmount: 30_000,
            overdueDays: 2,
            activeLoans: 1,
          },
        ],
        meta: { page: 1, pageSize: 20, total: 1 },
      });
    });
  });
});
