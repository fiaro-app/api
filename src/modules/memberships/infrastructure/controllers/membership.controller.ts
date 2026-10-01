import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ChangeMembershipRolesUseCase } from '@/modules/memberships/application/use-cases/change-membership-roles.use-case.js';
import { DeactivateMembershipUseCase } from '@/modules/memberships/application/use-cases/deactivate-membership.use-case.js';
import { InviteMembershipUseCase } from '@/modules/memberships/application/use-cases/invite-membership.use-case.js';
import {
  ApiChangeMembershipRoles,
  ApiDeactivateMembership,
  ApiInviteMembership,
} from '@/modules/memberships/infrastructure/controllers/docs/membership-routes.docs.js';
import {
  ChangeMembershipRolesRequestSchema,
  InviteMembershipRequestSchema,
} from '@/modules/memberships/infrastructure/controllers/schemas/membership-requests.schema.js';
import {
  toInvitedMembershipResponse,
  toMembershipResponse,
  type InvitedMembershipResponseSchema,
  type MembershipResponseSchema,
} from '@/modules/memberships/infrastructure/controllers/schemas/membership-responses.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import { hasAnyRole } from '@/shared/application/security/has-any-role.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/** Roles que pueden administrar membresías (mismo criterio que editar el prestamista, D-75). */
const EDITOR_ROLES = ['OWNER', 'LENDER'];

const MembershipIdParamSchema = z.uuid();

/**
 * Colaboradores (cobradores y prestamistas) del prestamista con el que opera la sesión. Exige
 * `LenderScopeGuard`, así que corre después de `AuthGuard` y ya sabe con qué Lender operar.
 *
 * @remarks
 * Las tres rutas exigen `OWNER` o `LENDER`, el mismo criterio que crear/editar en el resto del
 * sistema: administrar quién entra a un negocio es tan sensible como crear un cliente o un
 * préstamo. Además, ninguna deja que una sesión actúe sobre su propia membresía
 * (`scope.membershipId === id`): desactivarse o cambiarse los roles a sí mismo podría dejar un
 * negocio sin nadie que lo administre. Sin listar membresías todavía (`GET /memberships`): nada
 * lo necesita aún, se agrega cuando la UI lo pida. Sin auditoría propia todavía.
 */
@ApiTags(API_TAGS.membership.name)
@Controller('memberships')
@UseGuards(LenderScopeGuard)
export class MembershipController {
  constructor(
    private readonly inviteMembershipUseCase: InviteMembershipUseCase,
    private readonly deactivateMembershipUseCase: DeactivateMembershipUseCase,
    private readonly changeMembershipRolesUseCase: ChangeMembershipRolesUseCase,
  ) {}

  /**
   * @param body - Los datos de la persona, sus roles y, si aplica, su cartera, ya validados.
   * @param scope - El Lender con el que opera la sesión.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiInviteMembership()
  async inviteMembership(
    @Body({ schema: InviteMembershipRequestSchema })
    body: z.output<typeof InviteMembershipRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof InvitedMembershipResponseSchema>> {
    if (!hasAnyRole(scope.roles, EDITOR_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return toInvitedMembershipResponse(
      await this.inviteMembershipUseCase.execute({
        lenderId: scope.lenderId,
        ...body,
      }),
    );
  }

  /**
   * @param id - La membresía.
   * @param scope - El Lender con el que opera la sesión.
   */
  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiDeactivateMembership()
  async deactivateMembership(
    @Param('id', { schema: MembershipIdParamSchema }) id: string,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof MembershipResponseSchema>> {
    this.assertCanAdminister(scope, id);
    return toMembershipResponse(
      await this.deactivateMembershipUseCase.execute(id, scope.lenderId),
    );
  }

  /**
   * @param id - La membresía.
   * @param body - Los roles nuevos y, si aplica, la cartera, ya validados.
   * @param scope - El Lender con el que opera la sesión.
   */
  @Patch(':id/roles')
  @HttpCode(HttpStatus.OK)
  @ApiChangeMembershipRoles()
  async changeMembershipRoles(
    @Param('id', { schema: MembershipIdParamSchema }) id: string,
    @Body({ schema: ChangeMembershipRolesRequestSchema })
    body: z.output<typeof ChangeMembershipRolesRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof MembershipResponseSchema>> {
    this.assertCanAdminister(scope, id);
    return toMembershipResponse(
      await this.changeMembershipRolesUseCase.execute(
        id,
        scope.lenderId,
        body.roles,
        body.portfolioId,
      ),
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
