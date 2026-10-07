import { Inject, Injectable } from '@nestjs/common';
import type { PushTokenInput } from '@/modules/notifications/application/dtos/push-token.dto.js';
import { PushToken } from '@/modules/notifications/domain/entities/push-token.entity.js';
import type { PushTokenRepository } from '@/modules/notifications/domain/repositories/push-token.repository.js';
import { PUSH_TOKEN_REPOSITORY } from '@/modules/notifications/domain/tokens/push-token-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';

/**
 * Registra el token de push del dispositivo de la sesión (D-95). Es idempotente: la app lo manda
 * cada vez que se abre, y si el token ya existía solo actualiza su fecha, o se lo reasigna a esta
 * sesión si antes era de otra.
 */
@Injectable()
export class RegisterPushTokenUseCase {
  constructor(
    @Inject(PUSH_TOKEN_REPOSITORY)
    private readonly pushTokens: PushTokenRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** @param input - La persona de la sesión y el token del dispositivo. */
  async execute(input: PushTokenInput): Promise<void> {
    const now = this.clock.now();
    await this.pushTokens.upsert(
      PushToken.create({
        id: this.ids.next(),
        token: input.token,
        userId: input.userId,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }
}
