import { Inject, Injectable } from '@nestjs/common';
import type { AccountSession } from '@/modules/auth/application/dtos/account-session.dto.js';
import { describeDevice } from '@/modules/auth/domain/policies/device-description.js';
import type { SessionRepository } from '@/modules/auth/domain/repositories/session.repository.js';
import { SESSION_REPOSITORY } from '@/modules/auth/domain/tokens/session-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/**
 * Lista las sesiones abiertas de la persona autenticada, la más reciente primero, marcando cuál
 * es la actual. Cualquier rol: son siempre las propias.
 */
@Injectable()
export class ListAccountSessionsUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param userId - La persona autenticada.
   * @param currentSessionId - La sesión desde la que se hace la consulta.
   * @returns Sus sesiones vigentes.
   */
  async execute(
    userId: string,
    currentSessionId: string,
  ): Promise<readonly AccountSession[]> {
    const sessions = await this.sessions.listActiveForUser(
      userId,
      this.clock.now(),
    );
    return sessions.map((session) => ({
      id: session.id,
      isCurrent: session.id === currentSessionId,
      device: describeDevice(session.userAgent),
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      expiresAt: session.expiresAt,
    }));
  }
}
