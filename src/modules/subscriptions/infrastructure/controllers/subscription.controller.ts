import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { z } from 'zod';
import { GetSubscriptionUseCase } from '@/modules/subscriptions/application/use-cases/get-subscription.use-case.js';
import { ApiGetSubscription } from '@/modules/subscriptions/infrastructure/controllers/docs/subscription-routes.docs.js';
import {
  toSubscriptionResponse,
  type SubscriptionResponseSchema,
} from '@/modules/subscriptions/infrastructure/controllers/schemas/subscription-responses.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/**
 * El plan del negocio del prestamista con el que opera la sesión (D-115). Cualquier rol puede
 * verlo; solo informa, no bloquea nada.
 */
@ApiTags(API_TAGS.subscription.name)
@Controller('subscription')
@UseGuards(LenderScopeGuard)
export class SubscriptionController {
  constructor(private readonly getSubscription: GetSubscriptionUseCase) {}

  /** @param scope - El Lender con el que opera la sesión. */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiGetSubscription()
  async get(
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof SubscriptionResponseSchema>> {
    return toSubscriptionResponse(
      await this.getSubscription.execute(scope.lenderId),
    );
  }
}
