import { Inject, Injectable } from '@nestjs/common';
import type { PushTokenInput } from '@/modules/notifications/application/dtos/push-token.dto.js';
import type { PushTokenRepository } from '@/modules/notifications/domain/repositories/push-token.repository.js';
import { PUSH_TOKEN_REPOSITORY } from '@/modules/notifications/domain/tokens/push-token-repository.token.js';

/**
 * Quita el token del dispositivo de la sesión, por ejemplo al cerrarla (D-95). Solo quita un token
 * que sea de esa sesión: si es de otra persona, no pasa nada, y no revela de quién es.
 */
@Injectable()
export class RevokePushTokenUseCase {
  constructor(
    @Inject(PUSH_TOKEN_REPOSITORY)
    private readonly pushTokens: PushTokenRepository,
  ) {}

  /** @param input - La persona de la sesión y el token a quitar. */
  async execute(input: PushTokenInput): Promise<void> {
    await this.pushTokens.deleteForUser(input.userId, input.token);
  }
}
