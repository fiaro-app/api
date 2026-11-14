import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ProcessPaymentEventUseCase } from '@/modules/subscriptions/application/use-cases/process-payment-event.use-case.js';
import { ApiWompiWebhook } from '@/modules/subscriptions/infrastructure/controllers/docs/subscription-checkout.docs.js';
import { Public } from '@/shared/infrastructure/http/public.decorator.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/**
 * Los avisos de Wompi (D-149). Sin sesión (`@Public()`) y sin versión (`VERSION_NEUTRAL`): Wompi
 * no manda `API-Version` y la dirección se registra una vez en su panel. Lo que autentica el
 * aviso es su checksum, no una cookie.
 */
@ApiTags(API_TAGS.subscription.name)
@Public()
@Controller({ path: 'webhooks/wompi', version: VERSION_NEUTRAL })
export class WompiWebhookController {
  constructor(private readonly processEvent: ProcessPaymentEventUseCase) {}

  /**
   * @param body - El aviso, sin confiar en él.
   * @param checksum - Cabecera `X-Event-Checksum`.
   * @throws {@link UnauthorizedException} Si la firma no es válida (`UNAUTHENTICATED`).
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiWompiWebhook()
  async receive(
    // La forma y la firma del cuerpo las comprueba `PaymentGateway.parseEvent`.
    @Body({ schema: z.unknown() }) body: unknown,
    @Headers('x-event-checksum') checksum: string | undefined,
  ): Promise<Record<string, never>> {
    if ((await this.processEvent.execute(body, checksum)) === 'INVALID') {
      throw new UnauthorizedException({
        code: ErrorCodeSchema.enum.UNAUTHENTICATED,
      });
    }
    return {};
  }
}
