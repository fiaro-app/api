import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { z } from 'zod';
import { ListSubscriptionPaymentsUseCase } from '@/modules/subscriptions/application/use-cases/list-subscription-payments.use-case.js';
import { ApiListPayments } from '@/modules/subscriptions/infrastructure/controllers/docs/subscription-checkout.docs.js';
import {
  toPaymentHistoryResponse,
  type PaymentHistoryResponseSchema,
} from '@/modules/subscriptions/infrastructure/controllers/schemas/subscription-checkout.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import { hasAnyRole } from '@/shared/application/security/has-any-role.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/** El historial de pagos del plan (D-150). Solo la dueña, igual que pagar. */
@ApiTags(API_TAGS.subscription.name)
@Controller('subscription/payments')
@UseGuards(LenderScopeGuard)
export class SubscriptionPaymentsController {
  constructor(private readonly listPayments: ListSubscriptionPaymentsUseCase) {}

  /** @param scope - El Lender con el que opera la sesión. */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiListPayments()
  async list(
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof PaymentHistoryResponseSchema>> {
    if (!hasAnyRole(scope.roles, ['OWNER'])) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return toPaymentHistoryResponse(
      await this.listPayments.execute(scope.lenderId),
    );
  }
}
