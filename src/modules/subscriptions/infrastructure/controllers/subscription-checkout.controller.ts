import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CreateCheckoutUseCase } from '@/modules/subscriptions/application/use-cases/create-checkout.use-case.js';
import { GetCheckoutStatusUseCase } from '@/modules/subscriptions/application/use-cases/get-checkout-status.use-case.js';
import {
  ApiCreateCheckout,
  ApiGetCheckoutStatus,
} from '@/modules/subscriptions/infrastructure/controllers/docs/subscription-checkout.docs.js';
import {
  CheckoutResponseSchema,
  CheckoutStatusResponseSchema,
  CreateCheckoutRequestSchema,
  toCheckoutResponse,
  toCheckoutStatusResponse,
} from '@/modules/subscriptions/infrastructure/controllers/schemas/subscription-checkout.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import { hasAnyRole } from '@/shared/application/security/has-any-role.js';
import { AllowWhenReadOnly } from '@/shared/infrastructure/http/allow-when-read-only.decorator.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/** Solo la dueña paga la suscripción. */
const PAYER_ROLES = ['OWNER'];

const ReferenceParamSchema = z.string().min(1).max(100);

/**
 * Pago de la suscripción con Wompi (D-149): crear la orden y ver en qué quedó. Ambas rutas
 * siguen permitidas con el negocio en solo lectura (`@AllowWhenReadOnly()`): pagar es la salida.
 */
@ApiTags(API_TAGS.subscription.name)
@Controller('subscription/checkout')
@UseGuards(LenderScopeGuard)
export class SubscriptionCheckoutController {
  constructor(
    private readonly createCheckout: CreateCheckoutUseCase,
    private readonly getCheckoutStatus: GetCheckoutStatusUseCase,
  ) {}

  /**
   * @param body - El plan que se quiere pagar.
   * @param scope - El Lender con el que opera la sesión.
   */
  @Post()
  @AllowWhenReadOnly()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateCheckout()
  async create(
    @Body({ schema: CreateCheckoutRequestSchema })
    body: z.output<typeof CreateCheckoutRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof CheckoutResponseSchema>> {
    this.assertPayer(scope);
    return toCheckoutResponse(
      await this.createCheckout.execute(scope.lenderId, body.planCode),
    );
  }

  /**
   * @param reference - La referencia de la orden.
   * @param scope - El Lender con el que opera la sesión.
   */
  @Get(':reference')
  @HttpCode(HttpStatus.OK)
  @ApiGetCheckoutStatus()
  async status(
    @Param('reference') reference: string,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof CheckoutStatusResponseSchema>> {
    this.assertPayer(scope);
    return toCheckoutStatusResponse(
      await this.getCheckoutStatus.execute(
        scope.lenderId,
        ReferenceParamSchema.parse(reference),
      ),
    );
  }

  /** @throws {@link ForbiddenException} Sin el rol `OWNER` (`FORBIDDEN`). */
  private assertPayer(scope: LenderScope): void {
    if (!hasAnyRole(scope.roles, PAYER_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
  }
}
