import type { Env } from '@/config/env.js';
import type { PushSender } from '@/modules/notifications/application/ports/push-sender.port.js';
import type { PushTokenRepository } from '@/modules/notifications/domain/repositories/push-token.repository.js';
import { ExpoPushSender } from '@/modules/notifications/infrastructure/push/expo-push-sender.js';
import { LoggingPushSender } from '@/modules/notifications/infrastructure/push/logging-push-sender.js';

/**
 * Elige cómo se mandan las notificaciones push, según `PUSH_DELIVERY` (D-95): con Expo, o solo al
 * log. Por defecto, con Expo en producción y solo al log en el resto.
 *
 * @param env - Configuración validada: el modo de envío y el token de acceso de Expo, si hay uno.
 * @param tokens - El registro de tokens, para quitar los que Expo ya no reconoce.
 */
export function createPushSender(
  env: Pick<Env, 'push'>,
  tokens: Pick<PushTokenRepository, 'deleteByToken'>,
): PushSender {
  if (env.push.delivery === 'expo') {
    return new ExpoPushSender({
      accessToken: env.push.expoAccessToken,
      invalidTokens: tokens,
    });
  }
  return new LoggingPushSender();
}
