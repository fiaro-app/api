import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  QueryMethod,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { GetCollectorRouteUseCase } from '@/modules/collections/application/use-cases/get-collector-route.use-case.js';
import { ApiGetCollectorRoute } from '@/modules/collections/infrastructure/controllers/docs/collector-route-routes.docs.js';
import { GetCollectorRouteRequestSchema } from '@/modules/collections/infrastructure/controllers/schemas/collector-route-requests.schema.js';
import {
  toCollectorRouteResponse,
  type CollectorRouteResponseSchema,
} from '@/modules/collections/infrastructure/controllers/schemas/collector-route-responses.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import { hasAnyRole } from '@/shared/application/security/has-any-role.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/** Rol que puede ver la ruta: siempre la propia, de quien cobra (PRODUCT.md §5). */
const COLLECTOR_ROLES = ['COLLECTOR'];

/**
 * Ruta del día de un cobrador (PROTOTIPO-FLUJOS.md §4.2). Exige `LenderScopeGuard`, así que corre
 * después de `AuthGuard` y ya sabe con qué Lender operar.
 */
@ApiTags(API_TAGS.collectorRoute.name)
@Controller('collectors/me/route')
@UseGuards(LenderScopeGuard)
export class CollectorRouteController {
  constructor(
    private readonly getCollectorRouteUseCase: GetCollectorRouteUseCase,
  ) {}

  /**
   * @param query - La fecha, ya validada.
   * @param scope - El Lender y la membresía con la que opera la sesión.
   */
  @QueryMethod()
  @HttpCode(HttpStatus.OK)
  @ApiGetCollectorRoute()
  async getCollectorRoute(
    @Body({ schema: GetCollectorRouteRequestSchema })
    query: z.output<typeof GetCollectorRouteRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof CollectorRouteResponseSchema>> {
    if (!hasAnyRole(scope.roles, COLLECTOR_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return toCollectorRouteResponse(
      await this.getCollectorRouteUseCase.execute({
        collectorMembershipId: scope.membershipId,
        lenderId: scope.lenderId,
        date: query.date,
      }),
    );
  }
}
