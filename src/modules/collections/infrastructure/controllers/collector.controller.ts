import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { DeactivateCollectorUseCase } from '@/modules/collections/application/use-cases/deactivate-collector.use-case.js';
import { ApiDeactivateCollector } from '@/modules/collections/infrastructure/controllers/docs/collector-deactivation-routes.docs.js';
import { DeactivateCollectorRequestSchema } from '@/modules/collections/infrastructure/controllers/schemas/collector-deactivation-requests.schema.js';
import {
  toCollectorDeactivationResponse,
  type CollectorDeactivationResponseSchema,
} from '@/modules/collections/infrastructure/controllers/schemas/collector-deactivation-responses.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import { hasAnyRole } from '@/shared/application/security/has-any-role.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/** Roles que pueden dar de baja a un cobrador (mismo criterio que administrar membresías, D-92). */
const EDITOR_ROLES = ['OWNER', 'LENDER'];

const CollectorIdParamSchema = z.uuid();

/**
 * Baja de un cobrador del prestamista con el que opera la sesión. Exige `LenderScopeGuard`, así
 * que corre después de `AuthGuard` y ya sabe con qué Lender operar.
 *
 * @remarks
 * Vive en `collections` y no en `memberships` (D-97): solo este módulo conoce las asignaciones de
 * cobro, así que solo él puede garantizar que ningún préstamo quede sin cobrador al dar de baja al
 * que los tenía. `MembershipController` rechaza esta operación sobre una membresía `COLLECTOR` y
 * remite aquí. Mismo criterio que administrar membresías: exige `OWNER` o `LENDER`, y nunca sobre
 * la propia membresía de la sesión (un operador solo, con los tres roles, no puede darse de baja a
 * sí mismo como cobrador por esta ruta). Sin auditoría propia todavía.
 */
@ApiTags(API_TAGS.collectorDeactivation.name)
@Controller('collectors')
@UseGuards(LenderScopeGuard)
export class CollectorController {
  constructor(
    private readonly deactivateCollectorUseCase: DeactivateCollectorUseCase,
  ) {}

  /**
   * @param id - La membresía del cobrador.
   * @param body - A quién pasa cada préstamo activo que tiene asignado hoy, ya validado.
   * @param scope - El Lender con el que opera la sesión.
   */
  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiDeactivateCollector()
  async deactivateCollector(
    @Param('id', { schema: CollectorIdParamSchema }) id: string,
    @Body({ schema: DeactivateCollectorRequestSchema })
    body: z.output<typeof DeactivateCollectorRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof CollectorDeactivationResponseSchema>> {
    this.assertCanAdminister(scope, id);
    return toCollectorDeactivationResponse(
      await this.deactivateCollectorUseCase.execute({
        lenderId: scope.lenderId,
        collectorMembershipId: id,
        reassignments: body.reassignments,
      }),
    );
  }

  /**
   * Exige `OWNER` o `LENDER`, y nunca sobre la propia membresía de la sesión.
   *
   * @param scope - El Lender con el que opera la sesión.
   * @param id - La membresía objetivo.
   */
  private assertCanAdminister(scope: LenderScope, id: string): void {
    if (!hasAnyRole(scope.roles, EDITOR_ROLES) || scope.membershipId === id) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
  }
}
