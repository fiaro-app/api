import { Inject, Injectable } from '@nestjs/common';
import type { DeactivateAccountInput } from '@/modules/auth/application/dtos/deactivate-account.dto.js';
import type { PasswordHasher } from '@/modules/auth/application/ports/password-hasher.port.js';
import { PASSWORD_HASHER } from '@/modules/auth/application/ports/password-hasher.token.js';
import { WrongPasswordError } from '@/modules/auth/domain/errors/wrong-password.error.js';
import type { SessionRepository } from '@/modules/auth/domain/repositories/session.repository.js';
import { SESSION_REPOSITORY } from '@/modules/auth/domain/tokens/session-repository.token.js';
import type { UserRepository } from '@/modules/auth/domain/repositories/user.repository.js';
import { USER_REPOSITORY } from '@/modules/auth/domain/tokens/user-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/**
 * Desactiva la cuenta de la persona autenticada (baja lógica) y cierra todas sus sesiones, la
 * actual incluida.
 *
 * @remarks
 * Pide la contraseña actual como confirmación en vez de exigir una sesión «fresca»: `list-sessions`
 * ya mostró (D-67) que `freshAge` no calza con una sesión de 30 días. No borra ningún dato: solo
 * marca `deactivatedAt`, que además bloquea los inicios de sesión nuevos (`auth-hooks.ts`).
 */
@Injectable()
export class DeactivateAccountUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param input - La persona autenticada y su contraseña actual.
   * @throws {@link WrongPasswordError} Si la contraseña no es la de la cuenta.
   */
  async execute(input: DeactivateAccountInput): Promise<void> {
    const user = await this.users.findById(input.userId);
    if (user === null) {
      throw new Error(`La persona ${input.userId} no existe.`);
    }

    const passwordHash = await this.users.findPasswordHash(user.id);
    if (
      passwordHash === null ||
      !(await this.passwordHasher.verify(input.password, passwordHash))
    ) {
      throw new WrongPasswordError();
    }

    await this.users.deactivate(user.id, this.clock.now());
    await this.sessions.revokeAllForUser(user.id);
  }
}
