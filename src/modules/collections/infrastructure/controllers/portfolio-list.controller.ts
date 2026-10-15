import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  QueryMethod,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { z } from 'zod';
import { ListClientsWithBalanceUseCase } from '@/modules/collections/application/use-cases/list-clients-with-balance.use-case.js';
import { ListLoansWithBalanceUseCase } from '@/modules/collections/application/use-cases/list-loans-with-balance.use-case.js';
import {
  ApiListClientsWithBalance,
  ApiListLoansWithBalance,
} from '@/modules/collections/infrastructure/controllers/docs/portfolio-list-routes.docs.js';
import { ListClientsWithBalanceRequestSchema } from '@/modules/collections/infrastructure/controllers/schemas/client-list-requests.schema.js';
import {
  toClientListResponse,
  type ClientListResponseSchema,
} from '@/modules/collections/infrastructure/controllers/schemas/client-list-responses.schema.js';
import { ListLoansWithBalanceRequestSchema } from '@/modules/collections/infrastructure/controllers/schemas/loan-list-requests.schema.js';
import {
  toLoanListResponse,
  type LoanListResponseSchema,
} from '@/modules/collections/infrastructure/controllers/schemas/loan-list-responses.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import type { ReadCache } from '@/shared/application/ports/read-cache.port.js';
import { READ_CACHE } from '@/shared/application/ports/read-cache.token.js';
import { cacheKey } from '@/shared/infrastructure/cache/cache-key.js';
import { CACHE_TTL_SECONDS } from '@/shared/infrastructure/cache/cache-ttl.js';
import { isCollectorOnly } from '@/shared/application/security/is-collector-only.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/**
 * Para un cobrador que no administra, la consulta queda atada a su propia cartera, sea cual sea el
 * filtro que mande. Como el cobrador entra en los filtros, también entra en la clave de la caché:
 * lo que ve un cobrador nunca se sirve a otro ni al prestamista.
 *
 * @param scope - El Lender y la membresía con la que opera la sesión.
 * @param query - La consulta ya validada.
 */
function onlyOwnPortfolio<T extends object>(
  scope: LenderScope,
  query: T,
): T & { collectorMembershipId?: string } {
  return isCollectorOnly(scope.roles)
    ? { ...query, collectorMembershipId: scope.membershipId }
    : query;
}

/**
 * Las búsquedas de préstamos y de clientes del prestamista con el que opera la sesión, con el
 * saldo y la mora de cada fila (D-113). Exige `LenderScopeGuard`, así que corre después de
 * `AuthGuard` y ya sabe con qué Lender operar.
 *
 * @remarks
 * `QUERY /loans` y `QUERY /clients` viven aquí y no en `LoanController` ni `ClientController`
 * porque cada fila lleva lo que solo `collections` sabe calcular (el saldo y la mora salen de los
 * pagos de las visitas, D-84), y `loans` y `clients` no pueden depender de `collections` sin crear
 * un ciclo de módulos. El resto de las rutas de `/loans` y `/clients` sigue en sus módulos. Cualquier
 * rol puede verlas, pero un cobrador que no administra solo ve su propia cartera (`onlyOwnPortfolio`).
 */
@Controller()
@UseGuards(LenderScopeGuard)
export class PortfolioListController {
  constructor(
    private readonly listLoansWithBalanceUseCase: ListLoansWithBalanceUseCase,
    private readonly listClientsWithBalanceUseCase: ListClientsWithBalanceUseCase,
    @Inject(READ_CACHE) private readonly cache: ReadCache,
  ) {}

  /**
   * @param query - Página, tamaño y filtros opcionales, ya validados.
   * @param scope - El Lender con el que opera la sesión.
   */
  @ApiTags(API_TAGS.loan.name)
  @QueryMethod('loans')
  @HttpCode(HttpStatus.OK)
  @ApiListLoansWithBalance()
  async listLoans(
    @Body({ schema: ListLoansWithBalanceRequestSchema })
    query: z.output<typeof ListLoansWithBalanceRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof LoanListResponseSchema>> {
    const filters = onlyOwnPortfolio(scope, query);
    return this.cache.getOrLoad(
      scope.lenderId,
      cacheKey('loans', filters),
      CACHE_TTL_SECONDS.lists,
      async () =>
        toLoanListResponse(
          await this.listLoansWithBalanceUseCase.execute({
            lenderId: scope.lenderId,
            ...filters,
          }),
          query,
        ),
    );
  }

  /**
   * @param query - Página, tamaño y búsqueda opcional, ya validados.
   * @param scope - El Lender con el que opera la sesión.
   */
  @ApiTags(API_TAGS.client.name)
  @QueryMethod('clients')
  @HttpCode(HttpStatus.OK)
  @ApiListClientsWithBalance()
  async listClients(
    @Body({ schema: ListClientsWithBalanceRequestSchema })
    query: z.output<typeof ListClientsWithBalanceRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof ClientListResponseSchema>> {
    const filters = onlyOwnPortfolio(scope, query);
    return this.cache.getOrLoad(
      scope.lenderId,
      cacheKey('clients', filters),
      CACHE_TTL_SECONDS.lists,
      async () =>
        toClientListResponse(
          await this.listClientsWithBalanceUseCase.execute({
            lenderId: scope.lenderId,
            ...filters,
          }),
          query,
        ),
    );
  }
}
