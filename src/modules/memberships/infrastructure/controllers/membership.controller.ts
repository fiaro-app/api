import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  QueryMethod,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ChangeMembershipRolesUseCase } from '@/modules/memberships/application/use-cases/change-membership-roles.use-case.js';
import { DeactivateMembershipUseCase } from '@/modules/memberships/application/use-cases/deactivate-membership.use-case.js';
import { GetMembershipEntryUseCase } from '@/modules/memberships/application/use-cases/get-membership-entry.use-case.js';
import { GetMembershipUseCase } from '@/modules/memberships/application/use-cases/get-membership.use-case.js';
import { InviteMembershipUseCase } from '@/modules/memberships/application/use-cases/invite-membership.use-case.js';
import { ListMembershipsUseCase } from '@/modules/memberships/application/use-cases/list-memberships.use-case.js';
import { ResetMembershipPasswordUseCase } from '@/modules/memberships/application/use-cases/reset-membership-password.use-case.js';
import { InvalidMembershipDataError } from '@/modules/memberships/domain/errors/invalid-membership-data.error.js';
import {
  ApiChangeMembershipRoles,
  ApiDeactivateMembership,
  ApiGetMembership,
  ApiInviteMembership,
  ApiListMemberships,
  ApiResetMembershipPassword,
} from '@/modules/memberships/infrastructure/controllers/docs/membership-routes.docs.js';
import {
  ChangeMembershipRolesRequestSchema,
  InviteMembershipRequestSchema,
  ListMembershipsRequestSchema,
} from '@/modules/memberships/infrastructure/controllers/schemas/membership-requests.schema.js';
import {
  toInvitedMembershipResponse,
  toMembershipListEntryResponse,
  toMembershipResponse,
  toMembershipsPageResponse,
  type InvitedMembershipResponseSchema,
  type MembershipListEntryResponseSchema,
  type MembershipResponseSchema,
  type MembershipsPageResponseSchema,
  type ResetMembershipPasswordResponseSchema,
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
 * Las seis rutas exigen `OWNER` o `LENDER`, el mismo criterio que crear/editar en el resto del
 * sistema: administrar quién entra a un negocio (y ver quién ya está) es tan sensible como crear
 * un cliente o un préstamo. Las cuatro que actúan sobre una membresía puntual, además, nunca
 * dejan que una sesión actúe sobre la propia (`scope.membershipId === id`): desactivarse,
 * cambiarse los roles o restablecerse la contraseña a sí mismo por aquí no tiene sentido (ya
 * existe `/auth/change-password` para lo último) y podría, en el caso de desactivar o cambiar
 * roles, dejar un negocio sin nadie que lo administre (D-92: listar sí puede traer la propia, ver
 * no tiene ese riesgo). Sin auditoría propia todavía.
 */
@ApiTags(API_TAGS.membership.name)
@Controller('memberships')
@UseGuards(LenderScopeGuard)
export class MembershipController {
  constructor(
    private readonly inviteMembershipUseCase: InviteMembershipUseCase,
    private readonly deactivateMembershipUseCase: DeactivateMembershipUseCase,
    private readonly changeMembershipRolesUseCase: ChangeMembershipRolesUseCase,
    private readonly listMembershipsUseCase: ListMembershipsUseCase,
    private readonly resetMembershipPasswordUseCase: ResetMembershipPasswordUseCase,
    private readonly getMembershipUseCase: GetMembershipUseCase,
    private readonly getMembershipEntryUseCase: GetMembershipEntryUseCase,
  ) {}

  /**
   * @param query - Página, tamaño y los filtros opcionales de estado y rol, ya validados.
   * @param scope - El Lender con el que opera la sesión.
   */
  @QueryMethod()
  @HttpCode(HttpStatus.OK)
  @ApiListMemberships()
  async listMemberships(
    @Body({ schema: ListMembershipsRequestSchema })
    query: z.output<typeof ListMembershipsRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof MembershipsPageResponseSchema>> {
    if (!hasAnyRole(scope.roles, EDITOR_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    const page = await this.listMembershipsUseCase.execute({
      lenderId: scope.lenderId,
      ...query,
    });
    return toMembershipsPageResponse(page, query);
  }

  /**
   * @param id - La membresía.
   * @param scope - El Lender con el que opera la sesión.
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiGetMembership()
  async getMembership(
    @Param('id', { schema: MembershipIdParamSchema }) id: string,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof MembershipListEntryResponseSchema>> {
    if (!hasAnyRole(scope.roles, EDITOR_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return toMembershipListEntryResponse(
      await this.getMembershipEntryUseCase.execute(id, scope.lenderId),
    );
  }

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
    const membership = await this.getMembershipUseCase.execute(
      id,
      scope.lenderId,
    );
    if (membership.roles.includes('COLLECTOR')) {
      throw new InvalidMembershipDataError([
        {
          path: ['id'],
          message:
            'Un cobrador se da de baja con POST /collectors/:id/deactivate, que reasigna sus préstamos antes de darlo de baja.',
          params: {},
        },
      ]);
    }
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
   * @param id - La membresía.
   * @param scope - El Lender con el que opera la sesión.
   */
  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiResetMembershipPassword()
  async resetMembershipPassword(
    @Param('id', { schema: MembershipIdParamSchema }) id: string,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof ResetMembershipPasswordResponseSchema>> {
    this.assertCanAdminister(scope, id);
    const tempPassword = await this.resetMembershipPasswordUseCase.execute(
      id,
      scope.lenderId,
    );
    return { tempPassword };
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
