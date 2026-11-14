import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  Controller,
  Delete,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { DeleteMembershipUseCase } from '@/modules/memberships/application/use-cases/delete-membership.use-case.js';
import { ReactivateMembershipUseCase } from '@/modules/memberships/application/use-cases/reactivate-membership.use-case.js';
import {
  ApiDeleteMembership,
  ApiReactivateMembership,
} from '@/modules/memberships/infrastructure/controllers/docs/membership-lifecycle-routes.docs.js';
import {
  toMembershipResponse,
  type MembershipResponseSchema,
} from '@/modules/memberships/infrastructure/controllers/schemas/membership-responses.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import { hasAnyRole } from '@/shared/application/security/has-any-role.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/** Roles que pueden administrar membresías (mismo criterio que `MembershipController`). */
const EDITOR_ROLES = ['OWNER', 'LENDER'];

const MembershipIdParamSchema = z.uuid();

/**
 * Reactivar y borrar colaboradores (D-116). Viven aparte de `MembershipController` solo para que
 * cada archivo siga siendo corto; comparten ruta base, guard y reglas de permiso.
 */
@ApiTags(API_TAGS.membership.name)
@Controller('memberships')
@UseGuards(LenderScopeGuard)
export class MembershipLifecycleController {
  constructor(
    private readonly reactivateMembershipUseCase: ReactivateMembershipUseCase,
    private readonly deleteMembershipUseCase: DeleteMembershipUseCase,
  ) {}

  /**
   * @param id - La membresía.
   * @param scope - El Lender con el que opera la sesión.
   */
  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiReactivateMembership()
  async reactivateMembership(
    @Param('id', { schema: MembershipIdParamSchema }) id: string,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof MembershipResponseSchema>> {
    assertCanAdminister(scope, id);
    return toMembershipResponse(
      await this.reactivateMembershipUseCase.execute(id, scope.lenderId),
    );
  }

  /**
   * @param id - La membresía.
   * @param scope - El Lender con el que opera la sesión.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteMembership()
  async deleteMembership(
    @Param('id', { schema: MembershipIdParamSchema }) id: string,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<void> {
    assertCanAdminister(scope, id);
    await this.deleteMembershipUseCase.execute(id, scope.lenderId);
  }
}

/** Exige `OWNER` o `LENDER`, y nunca sobre la propia membresía de la sesión. */
function assertCanAdminister(scope: LenderScope, id: string): void {
  if (!hasAnyRole(scope.roles, EDITOR_ROLES) || scope.membershipId === id) {
    throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
  }
}
