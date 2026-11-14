import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { z } from 'zod';
import { ListAllSubscriptionPaymentsUseCase } from '@/modules/subscriptions/application/use-cases/list-all-subscription-payments.use-case.js';
import { RefundSubscriptionPaymentUseCase } from '@/modules/subscriptions/application/use-cases/refund-subscription-payment.use-case.js';
import {
  ApiListAdminPayments,
  ApiRefundPayment,
} from '@/modules/subscriptions/infrastructure/controllers/docs/subscription-refund.docs.js';
import {
  AdminPaymentsResponseSchema,
  RefundResponseSchema,
  ListAdminPaymentsQuerySchema,
  RefundPaymentRequestSchema,
  toAdminPaymentsResponse,
  toRefundResponse,
} from '@/modules/subscriptions/infrastructure/controllers/schemas/subscription-refund.schema.js';
import type { AuthenticatedUser } from '@/shared/application/ports/session-resolver.port.js';
import { CurrentUser } from '@/shared/infrastructure/http/current-user.decorator.js';
import { PlatformAdminGuard } from '@/shared/infrastructure/http/platform-admin.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/** Cuántos pagos trae la lista de quien opera la plataforma. */
const LIST_LIMIT = 50;

/**
 * Los pagos del plan de todos los negocios y su reembolso (D-156). Es de quien opera la plataforma
 * (`PlatformAdminGuard`), no de un negocio: no usa `LenderScopeGuard`.
 */
@ApiTags(API_TAGS.subscription.name)
@Controller('admin/subscription-payments')
@UseGuards(PlatformAdminGuard)
export class AdminSubscriptionPaymentsController {
  constructor(
    private readonly listPayments: ListAllSubscriptionPaymentsUseCase,
    private readonly refundPayment: RefundSubscriptionPaymentUseCase,
  ) {}

  /** @param query - El estado por el que se filtra, opcional, ya validado. */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiListAdminPayments()
  async list(
    @Query({ schema: ListAdminPaymentsQuerySchema })
    query: z.output<typeof ListAdminPaymentsQuerySchema>,
  ): Promise<z.output<typeof AdminPaymentsResponseSchema>> {
    return toAdminPaymentsResponse(
      await this.listPayments.execute(LIST_LIMIT, query.status),
    );
  }

  /**
   * @param reference - La referencia de la orden.
   * @param body - Cómo se devuelve y por qué, ya validado.
   * @param user - La persona que opera la plataforma.
   */
  @Post(':reference/refund')
  @HttpCode(HttpStatus.OK)
  @ApiRefundPayment()
  async refund(
    @Param('reference') reference: string,
    @Body({ schema: RefundPaymentRequestSchema })
    body: z.output<typeof RefundPaymentRequestSchema>,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<z.output<typeof RefundResponseSchema>> {
    return toRefundResponse(
      await this.refundPayment.execute({
        reference,
        mode: body.mode,
        refundReference: body.reference ?? null,
        reason: body.reason,
        actorUserId: user.id,
      }),
    );
  }
}
