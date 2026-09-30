import { ForbiddenException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it, vi } from 'vitest';
import type { CreateClientUseCase } from '@/modules/clients/application/use-cases/create-client.use-case.js';
import type { GetClientUseCase } from '@/modules/clients/application/use-cases/get-client.use-case.js';
import type { ListClientsUseCase } from '@/modules/clients/application/use-cases/list-clients.use-case.js';
import type { UpdateClientUseCase } from '@/modules/clients/application/use-cases/update-client.use-case.js';
import { ClientController } from '@/modules/clients/infrastructure/controllers/client.controller.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';

const DETAILS = {
  id: 'client-1',
  nationalId: '1020304050',
  fullName: 'Carlos Andrés Gómez',
  occupation: 'Vendedor ambulante',
  phone: '+573001234567',
  address: 'Calle 45 # 12-30, Bogotá',
  createdAt: new Date('2026-09-30T00:00:00Z'),
};

function setup() {
  const createClientUseCase = {
    execute: vi.fn(() => Promise.resolve(DETAILS)),
  };
  const getClientUseCase = { execute: vi.fn(() => Promise.resolve(DETAILS)) };
  const listClientsUseCase = {
    execute: vi.fn(() => Promise.resolve({ items: [DETAILS], total: 1 })),
  };
  const updateClientUseCase = {
    execute: vi.fn(() => Promise.resolve(DETAILS)),
  };
  const controller = new ClientController(
    createClientUseCase as unknown as CreateClientUseCase,
    getClientUseCase as unknown as GetClientUseCase,
    listClientsUseCase as unknown as ListClientsUseCase,
    updateClientUseCase as unknown as UpdateClientUseCase,
  );
  return {
    controller,
    createClientUseCase,
    getClientUseCase,
    listClientsUseCase,
    updateClientUseCase,
  };
}

const scopeWith = (roles: readonly string[]): LenderScope => ({
  membershipId: 'membership-1',
  lenderId: 'lender-1',
  roles,
});

const CREATE_BODY = {
  nationalId: '1020304050',
  fullName: 'Carlos Andrés Gómez',
  occupation: 'Vendedor ambulante',
  phone: '+573001234567',
  address: 'Calle 45 # 12-30, Bogotá',
};

describe('ClientController', () => {
  it('publica POST, GET, QUERY y PATCH, todas colgando de /clients', () => {
    const publishedRoutes = Object.getOwnPropertyNames(
      ClientController.prototype,
    )
      .flatMap((name) => {
        const handler = Reflect.get(ClientController.prototype, name) as object;
        const method = Reflect.getMetadata(METHOD_METADATA, handler) as
          RequestMethod | undefined;
        return method === undefined ? [] : [RequestMethod[method]];
      })
      .sort();

    expect(publishedRoutes).toEqual(['GET', 'PATCH', 'POST', 'QUERY'].sort());
    expect(Reflect.getMetadata(PATH_METADATA, ClientController)).toBe(
      'clients',
    );
  });

  describe('createClient', () => {
    it('con rol OWNER crea el cliente', async () => {
      const { controller, createClientUseCase } = setup();

      const response = await controller.createClient(
        CREATE_BODY,
        scopeWith(['OWNER']),
      );

      expect(createClientUseCase.execute).toHaveBeenCalledExactlyOnceWith({
        lenderId: 'lender-1',
        ...CREATE_BODY,
      });
      expect(response.id).toBe('client-1');
    });

    it('con rol LENDER también crea', async () => {
      const { controller, createClientUseCase } = setup();

      await controller.createClient(CREATE_BODY, scopeWith(['LENDER']));

      expect(createClientUseCase.execute).toHaveBeenCalledOnce();
    });

    it('con solo el rol COLLECTOR responde 403 sin llamar al caso de uso', async () => {
      const { controller, createClientUseCase } = setup();

      const error = await controller
        .createClient(CREATE_BODY, scopeWith(['COLLECTOR']))
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toEqual({
        code: 'FORBIDDEN',
      });
      expect(createClientUseCase.execute).not.toHaveBeenCalled();
    });

    it('sin ningún rol conocido responde 403 sin llamar al caso de uso', async () => {
      const { controller, createClientUseCase } = setup();

      const error = await controller
        .createClient(CREATE_BODY, scopeWith([]))
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(createClientUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('getClient', () => {
    it('devuelve el cliente para cualquier rol, incluido COLLECTOR', async () => {
      const { controller, getClientUseCase } = setup();

      const response = await controller.getClient(
        'client-1',
        scopeWith(['COLLECTOR']),
      );

      expect(getClientUseCase.execute).toHaveBeenCalledExactlyOnceWith(
        'client-1',
        'lender-1',
      );
      expect(response.id).toBe('client-1');
    });
  });

  describe('listClients', () => {
    it('devuelve la página de clientes del prestamista de la sesión', async () => {
      const { controller, listClientsUseCase } = setup();

      const response = await controller.listClients(
        { page: 1, pageSize: 20 },
        scopeWith(['COLLECTOR']),
      );

      expect(listClientsUseCase.execute).toHaveBeenCalledExactlyOnceWith({
        lenderId: 'lender-1',
        page: 1,
        pageSize: 20,
      });
      expect(response).toEqual({
        data: [
          {
            id: 'client-1',
            nationalId: '1020304050',
            fullName: 'Carlos Andrés Gómez',
            occupation: 'Vendedor ambulante',
            phone: '+573001234567',
            address: 'Calle 45 # 12-30, Bogotá',
            createdAt: '2026-09-30T00:00:00.000Z',
          },
        ],
        meta: { page: 1, pageSize: 20, total: 1 },
      });
    });
  });

  describe('updateClient', () => {
    it('con rol OWNER actualiza el cliente', async () => {
      const { controller, updateClientUseCase } = setup();

      const response = await controller.updateClient(
        'client-1',
        { fullName: 'Carlos Gómez' },
        scopeWith(['OWNER']),
      );

      expect(updateClientUseCase.execute).toHaveBeenCalledExactlyOnceWith({
        clientId: 'client-1',
        lenderId: 'lender-1',
        fullName: 'Carlos Gómez',
      });
      expect(response.id).toBe('client-1');
    });

    it('con rol LENDER también actualiza', async () => {
      const { controller, updateClientUseCase } = setup();

      await controller.updateClient(
        'client-1',
        { address: 'Nueva dirección' },
        scopeWith(['LENDER']),
      );

      expect(updateClientUseCase.execute).toHaveBeenCalledOnce();
    });

    it('con solo el rol COLLECTOR responde 403 sin llamar al caso de uso', async () => {
      const { controller, updateClientUseCase } = setup();

      const error = await controller
        .updateClient('client-1', { fullName: 'x' }, scopeWith(['COLLECTOR']))
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toEqual({
        code: 'FORBIDDEN',
      });
      expect(updateClientUseCase.execute).not.toHaveBeenCalled();
    });
  });
});
