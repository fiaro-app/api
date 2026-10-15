import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Inject,
  QueryMethod,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { z } from 'zod';
import { GetClientsRiskUseCase } from '@/modules/dashboard/application/use-cases/get-clients-risk.use-case.js';
import { ApiGetClientsRisk } from '@/modules/dashboard/infrastructure/controllers/docs/clients-risk-routes.docs.js';
import {
  GetClientsRiskRequestSchema,
  toClientsRiskResponse,
  type ClientsRiskResponseSchema,
} from '@/modules/dashboard/infrastructure/controllers/schemas/clients-risk-schemas.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import type { ReadCache } from '@/shared/application/ports/read-cache.port.js';
import { READ_CACHE } from '@/shared/application/ports/read-cache.token.js';
import { hasAnyRole } from '@/shared/application/security/has-any-role.js';
import { cacheKey } from '@/shared/infrastructure/cache/cache-key.js';
import { CACHE_TTL_SECONDS } from '@/shared/infrastructure/cache/cache-ttl.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/** Roles que pueden ver el riesgo de un cliente. */
const VIEWER_ROLES = ['OWNER', 'LENDER'];

/**
 * `QUERY /lenders/me/clients/risk`: el riesgo de hasta 50 clientes del negocio (D-137). Exige
 * `OWNER` o `LENDER`; va en la caché de lecturas, que cada escritura del prestamista invalida.
 */
@ApiTags(API_TAGS.lenderDashboard.name)
@Controller('lenders/me')
@UseGuards(LenderScopeGuard)
export class LenderClientsRiskController {
  constructor(
    private readonly getClientsRisk: GetClientsRiskUseCase,
    @Inject(READ_CACHE) private readonly cache: ReadCache,
  ) {}

  /**
   * @param query - Los clientes a puntuar, ya validados.
   * @param scope - El Lender con el que opera la sesión.
   */
  @QueryMethod('clients/risk')
  @HttpCode(HttpStatus.OK)
  @ApiGetClientsRisk()
  async getRisk(
    @Body({ schema: GetClientsRiskRequestSchema })
    query: z.output<typeof GetClientsRiskRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof ClientsRiskResponseSchema>> {
    if (!hasAnyRole(scope.roles, VIEWER_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return this.cache.getOrLoad(
      scope.lenderId,
      cacheKey('clients-risk', query),
      CACHE_TTL_SECONDS.stats,
      async () =>
        toClientsRiskResponse(
          await this.getClientsRisk.execute({
            lenderId: scope.lenderId,
            clientIds: query.clientIds,
          }),
        ),
    );
  }
}
