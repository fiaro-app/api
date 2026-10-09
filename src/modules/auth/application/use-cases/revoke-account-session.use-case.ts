import { Inject, Injectable } from '@nestjs/common';
import { CurrentSessionNotRevocableError } from '@/modules/auth/domain/errors/current-session-not-revocable.error.js';
import { SessionNotFoundError } from '@/modules/auth/domain/errors/session-not-found.error.js';
import type { SessionRepository } from '@/modules/auth/domain/repositories/session.repository.js';
import { SESSION_REPOSITORY } from '@/modules/auth/domain/tokens/session-repository.token.js';

/**
 * Cierra una sesión puntual de la persona autenticada (por ejemplo, la de un dispositivo que
 * perdió), sin tocar las demás.
 */
@Injectable()
export class RevokeAccountSessionUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
  ) {}

  /**
   * @param sessionId - La sesión a cerrar.
   * @param userId - La persona autenticada: solo puede cerrar las suyas.
   * @param currentSessionId - La sesión desde la que se hace la petición.
   * @throws {@link CurrentSessionNotRevocableError} Si es la sesión actual.
   * @throws {@link SessionNotFoundError} Si no existe, ya venció o es de otra persona.
   */
  async execute(
    sessionId: string,
    userId: string,
    currentSessionId: string,
  ): Promise<void> {
    if (sessionId === currentSessionId) {
      throw new CurrentSessionNotRevocableError();
    }
    const revoked = await this.sessions.revokeOne(sessionId, userId);
    if (!revoked) {
      throw new SessionNotFoundError(sessionId);
    }
  }
}
