import { ForbiddenException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it, vi } from 'vitest';
import type { CreatePortfolioUseCase } from '@/modules/lenders/application/use-cases/create-portfolio.use-case.js';
import type { ListPortfoliosUseCase } from '@/modules/lenders/application/use-cases/list-portfolios.use-case.js';
import { PortfolioController } from '@/modules/lenders/infrastructure/controllers/portfolio.controller.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';

const DETAILS = {
  id: 'portfolio-1',
  name: 'Zona Norte',
  isDefault: false,
  createdAt: new Date('2026-09-30T00:00:00Z'),
};

function setup() {
  const createPortfolioUseCase = {
    execute: vi.fn(() => Promise.resolve(DETAILS)),
  };
  const listPortfoliosUseCase = {
    execute: vi.fn(() => Promise.resolve([DETAILS])),
  };
  const controller = new PortfolioController(
    createPortfolioUseCase as unknown as CreatePortfolioUseCase,
    listPortfoliosUseCase as unknown as ListPortfoliosUseCase,
  );
  return { controller, createPortfolioUseCase, listPortfoliosUseCase };
}

const scopeWith = (roles: readonly string[]): LenderScope => ({
  membershipId: 'membership-1',
  lenderId: 'lender-1',
  roles,
});

describe('PortfolioController', () => {
  it('publica solo POST y GET, colgando de /portfolios', () => {
    const publishedRoutes = Object.getOwnPropertyNames(
      PortfolioController.prototype,
    )
      .flatMap((name) => {
        const handler = Reflect.get(
          PortfolioController.prototype,
          name,
        ) as object;
        const method = Reflect.getMetadata(METHOD_METADATA, handler) as
          RequestMethod | undefined;
        return method === undefined ? [] : [RequestMethod[method]];
      })
      .sort();

    expect(publishedRoutes).toEqual(['GET', 'POST']);
    expect(Reflect.getMetadata(PATH_METADATA, PortfolioController)).toBe(
      'portfolios',
    );
  });

  describe('createPortfolio', () => {
    it('con rol OWNER crea la cartera', async () => {
      const { controller, createPortfolioUseCase } = setup();

      const response = await controller.createPortfolio(
        { name: 'Zona Norte' },
        scopeWith(['OWNER']),
      );

      expect(createPortfolioUseCase.execute).toHaveBeenCalledExactlyOnceWith({
        lenderId: 'lender-1',
        name: 'Zona Norte',
      });
      expect(response.name).toBe('Zona Norte');
    });

    it('con rol LENDER también crea', async () => {
      const { controller, createPortfolioUseCase } = setup();

      await controller.createPortfolio(
        { name: 'Zona Sur' },
        scopeWith(['LENDER']),
      );

      expect(createPortfolioUseCase.execute).toHaveBeenCalledOnce();
    });

    it('con solo el rol COLLECTOR responde 403 sin llamar al caso de uso', async () => {
      const { controller, createPortfolioUseCase } = setup();

      const error = await controller
        .createPortfolio({ name: 'Zona Norte' }, scopeWith(['COLLECTOR']))
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toEqual({
        code: 'FORBIDDEN',
      });
      expect(createPortfolioUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('listPortfolios', () => {
    it('devuelve las carteras del prestamista de la sesión, para cualquier rol', async () => {
      const { controller, listPortfoliosUseCase } = setup();

      const response = await controller.listPortfolios(
        scopeWith(['COLLECTOR']),
      );

      expect(listPortfoliosUseCase.execute).toHaveBeenCalledExactlyOnceWith(
        'lender-1',
      );
      expect(response).toEqual([
        {
          id: 'portfolio-1',
          name: 'Zona Norte',
          isDefault: false,
          createdAt: '2026-09-30T00:00:00.000Z',
        },
      ]);
    });
  });
});
