import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { z } from 'zod';
import { GetMembershipUseCase } from '@/modules/memberships/application/use-cases/get-membership.use-case.js';
import { ApiGetOwnMembership } from '@/modules/memberships/infrastructure/controllers/docs/own-membership-routes.docs.js';
import {
  toMembershipResponse,
  type MembershipResponseSchema,
} from '@/modules/memberships/infrastructure/controllers/schemas/membership-responses.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/**
 * `GET /memberships/me`: la membresía de quien llama, con sus roles (D-124). Sirve a cualquier rol,
 * también al cobrador: las apps ya no deducen el rol buscándose en `QUERY /memberships`.
 *
 * @remarks
 * Se registra antes que `MembershipController` para que `GET /memberships/:id` no capture `me`.
 */
@ApiTags(API_TAGS.membership.name)
@Controller('memberships')
@UseGuards(LenderScopeGuard)
export class OwnMembershipController {
  constructor(private readonly getMembershipUseCase: GetMembershipUseCase) {}

  /** @param scope - El Lender con el que opera la sesión, y su membresía. */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiGetOwnMembership()
  async getOwnMembership(
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof MembershipResponseSchema>> {
    return toMembershipResponse(
      await this.getMembershipUseCase.execute(
        scope.membershipId,
        scope.lenderId,
      ),
    );
  }
}
