import { Inject, Injectable } from '@nestjs/common';
import { AdminResetPasswordUseCase } from '@/modules/auth/application/use-cases/admin-reset-password.use-case.js';
import { GetUserByIdUseCase } from '@/modules/auth/application/use-cases/get-user-by-id.use-case.js';
import { GetMembershipUseCase } from '@/modules/memberships/application/use-cases/get-membership.use-case.js';
import { membershipPasswordResetEmail } from '@/modules/memberships/domain/notifications/membership-password-reset-email.js';
import type { EmailSender } from '@/modules/notifications/application/ports/email-sender.port.js';
import { EMAIL_SENDER } from '@/modules/notifications/application/ports/email-sender.token.js';

/**
 * Restablece la contraseña de un colaborador del prestamista de la sesión a una temporal nueva
 * (D-93, PROTOTIPO-FLUJOS.md §4.7): para cuando no tiene cómo recuperarla por su cuenta (sin
 * correo de contacto, por ejemplo) y alguien con `OWNER`/`LENDER` necesita dársela de nuevo.
 *
 * @remarks
 * Compone `GetMembershipUseCase` (valida que la membresía sea del prestamista de la sesión) y
 * `AdminResetPasswordUseCase` (`auth/application`, hace el cambio real) — el control de quién
 * puede pedirlo vive en el controller (`OWNER`/`LENDER`, igual que administrar membresías), no
 * aquí. El correo de cortesía es best-effort: si la persona no tiene correo de contacto, o por
 * algún motivo no se pudo leer su nombre/celular, la contraseña ya quedó restablecida de todos
 * modos y se devuelve igual — el canal principal es la respuesta, no el correo (mismo criterio
 * que `InviteMembershipUseCase`, D-81).
 */
@Injectable()
export class ResetMembershipPasswordUseCase {
  constructor(
    private readonly getMembership: GetMembershipUseCase,
    private readonly getUserById: GetUserByIdUseCase,
    private readonly adminResetPassword: AdminResetPasswordUseCase,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
  ) {}

  /**
   * @param id - La membresía.
   * @param lenderId - El prestamista dueño, tal como lo resolvió `LenderScopeGuard`.
   * @returns La contraseña temporal en claro, para pasarla por WhatsApp.
   * @throws {@link MembershipNotFoundError} Si no existe, o es de otro prestamista.
   */
  async execute(id: string, lenderId: string): Promise<string> {
    const membership = await this.getMembership.execute(id, lenderId);
    const user = await this.getUserById.execute(membership.userId);
    const tempPassword = await this.adminResetPassword.execute(
      membership.userId,
    );

    if (user?.contactEmail) {
      this.emailSender.send({
        to: user.contactEmail,
        ...membershipPasswordResetEmail(
          user.fullName,
          user.phone,
          tempPassword,
        ),
      });
    }

    return tempPassword;
  }
}
