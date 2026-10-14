import { Inject, Injectable } from '@nestjs/common';
import type { PasswordHasher } from '@/modules/auth/application/ports/password-hasher.port.js';
import { PASSWORD_HASHER } from '@/modules/auth/application/ports/password-hasher.token.js';
import { assertPasswordAllowed } from '@/modules/auth/domain/policies/password.policy.js';
import { assertPasswordStrong } from '@/modules/auth/domain/policies/password-strength.policy.js';
import type { SessionRepository } from '@/modules/auth/domain/repositories/session.repository.js';
import { SESSION_REPOSITORY } from '@/modules/auth/domain/tokens/session-repository.token.js';
import type { UserRepository } from '@/modules/auth/domain/repositories/user.repository.js';
import { USER_REPOSITORY } from '@/modules/auth/domain/tokens/user-repository.token.js';
import type { TempPasswordGenerator } from '@/shared/application/ports/temp-password-generator.port.js';
import { TEMP_PASSWORD_GENERATOR } from '@/shared/application/ports/temp-password-generator.token.js';

/**
 * Restablece la contraseña de una persona a una temporal nueva, sin que conozca la anterior. Lo
 * usa `memberships` para que un `OWNER`/`LENDER` reinicie la de un colaborador (D-93,
 * PROTOTIPO-FLUJOS.md §4.7) — mismo mecanismo que invitar a alguien nuevo (D-81), solo que aquí la
 * persona ya existe.
 *
 * @remarks
 * Revoca todas sus sesiones: la contraseña vieja ya no sirve para nada, igual que al recuperarla
 * por correo (`ResetPasswordUseCase`). No valida un código ni una contraseña anterior, a
 * diferencia de ese caso de uso — por eso quien llama a este (`memberships`) es responsable de
 * verificar que quien lo pide tenga permiso para administrar a esa persona.
 */
@Injectable()
export class AdminResetPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(TEMP_PASSWORD_GENERATOR)
    private readonly tempPasswords: TempPasswordGenerator,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
  ) {}

  /**
   * @param userId - La persona.
   * @returns La contraseña temporal en claro, para pasarla por WhatsApp.
   * @throws {@link InvalidPasswordError} Si la contraseña generada no tiene la longitud
   * permitida — nunca debería pasar con {@link TempPasswordGenerator}, pero no se asume.
   */
  async execute(userId: string): Promise<string> {
    const tempPassword = this.tempPasswords.next();
    assertPasswordAllowed(tempPassword);
    assertPasswordStrong(tempPassword, {});

    await this.users.resetToTemporaryPassword(
      userId,
      await this.passwordHasher.hash(tempPassword),
    );
    await this.sessions.revokeAllForUser(userId);
    return tempPassword;
  }
}
