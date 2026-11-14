import { describe, expect, it, vi } from 'vitest';
import type { ListClientsUseCase } from '@/modules/clients/application/use-cases/list-clients.use-case.js';
import { FindClientIdByNationalIdUseCase } from '@/modules/loan-requests/application/use-cases/find-client-id-by-national-id.use-case.js';

function setup(items: readonly { id: string; nationalId: string }[]) {
  const listClients = {
    execute: vi.fn(() => Promise.resolve({ items, total: items.length })),
  };
  return {
    listClients,
    useCase: new FindClientIdByNationalIdUseCase(
      listClients as unknown as ListClientsUseCase,
    ),
  };
}

describe('FindClientIdByNationalIdUseCase', () => {
  it('busca la cédula ya sin separadores y devuelve el cliente de esa cédula exacta', async () => {
    const { useCase, listClients } = setup([
      { id: 'client-2', nationalId: '11020304050' },
      { id: 'client-1', nationalId: '1020304050' },
    ]);

    expect(await useCase.execute('lender-1', '1.020.304.050')).toBe('client-1');
    expect(listClients.execute).toHaveBeenCalledWith({
      lenderId: 'lender-1',
      page: 1,
      pageSize: 10,
      search: '1020304050',
    });
  });

  it('devuelve null cuando solo hay coincidencias parciales', async () => {
    const { useCase } = setup([{ id: 'client-2', nationalId: '11020304050' }]);

    expect(await useCase.execute('lender-1', '1020304050')).toBeNull();
  });
});
