import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { z } from 'zod';
import { RegisterPushTokenUseCase } from '@/modules/notifications/application/use-cases/register-push-token.use-case.js';
import { RevokePushTokenUseCase } from '@/modules/notifications/application/use-cases/revoke-push-token.use-case.js';
import {
  ApiRegisterPushToken,
  ApiRevokePushToken,
} from '@/modules/notifications/infrastructure/controllers/docs/push-token-routes.docs.js';
import { PushTokenRequestSchema } from '@/modules/notifications/infrastructure/controllers/schemas/push-token-requests.schema.js';
import type { AuthenticatedUser } from '@/shared/application/ports/session-resolver.port.js';
import { CurrentUser } from '@/shared/infrastructure/http/current-user.decorator.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/**
 * Dispositivos para las notificaciones push (D-95). La app registra su token al abrir la sesión y
 * lo quita al cerrarla. Siempre opera sobre el dispositivo de quien tiene la sesión: el token viene
 * en el cuerpo, pero la persona sale de la sesión.
 *
 * @remarks
 * Sin `LenderScopeGuard`, igual que `/notifications`: un dispositivo recibe las notificaciones de
 * todos los prestamistas para los que trabaja la persona. Sin rol propio: cualquier sesión puede
 * registrar su dispositivo.
 */
@ApiTags(API_TAGS.notification.name)
@Controller('push-tokens')
export class PushTokenController {
  constructor(
    private readonly registerPushToken: RegisterPushTokenUseCase,
    private readonly revokePushToken: RevokePushTokenUseCase,
  ) {}

  /**
   * @param body - El token de Expo del dispositivo, ya validado.
   * @param user - Quién tiene la sesión.
   */
  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiRegisterPushToken()
  async register(
    @Body({ schema: PushTokenRequestSchema })
    body: z.output<typeof PushTokenRequestSchema>,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.registerPushToken.execute({
      userId: user.id,
      token: body.token,
    });
  }

  /**
   * @param body - El token de Expo del dispositivo, ya validado.
   * @param user - Quién tiene la sesión.
   */
  @Post('revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiRevokePushToken()
  async revoke(
    @Body({ schema: PushTokenRequestSchema })
    body: z.output<typeof PushTokenRequestSchema>,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.revokePushToken.execute({ userId: user.id, token: body.token });
  }
}
