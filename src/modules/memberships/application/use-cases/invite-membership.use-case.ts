import { Inject, Injectable } from '@nestjs/common';
import { CreateUserUseCase } from '@/modules/auth/application/use-cases/create-user.use-case.js';
import { GetUserByPhoneUseCase } from '@/modules/auth/application/use-cases/get-user-by-phone.use-case.js';
import type {
  InvitedMembership,
  InviteMembershipInput,
} from '@/modules/memberships/application/dtos/invite-membership.dto.js';
import { toMembershipDetailsFromCreated } from '@/modules/memberships/application/dtos/membership-details.mapper.js';
import {
  validateMembershipData,
  type ValidMembershipData,
} from '@/modules/memberships/application/services/membership-data.validator.js';
import { CreateMembershipUseCase } from '@/modules/memberships/application/use-cases/create-membership.use-case.js';
import { InvalidMembershipDataError } from '@/modules/memberships/domain/errors/invalid-membership-data.error.js';
import { membershipInviteEmail } from '@/modules/memberships/domain/notifications/membership-invite-email.js';
import type { EmailSender } from '@/modules/notifications/application/ports/email-sender.port.js';
import { EMAIL_SENDER } from '@/modules/notifications/application/ports/email-sender.token.js';
import type { TempPasswordGenerator } from '@/shared/application/ports/temp-password-generator.port.js';
import { TEMP_PASSWORD_GENERATOR } from '@/shared/application/ports/temp-password-generator.token.js';

/**
 * Invita a un colaborador (cobrador o prestamista) al negocio con el que opera la sesión
 * (PRODUCT.md §5).
 *
 * @remarks
 * Si el celular ya tiene cuenta, solo se agrega la membresía: esa persona puede trabajar para
 * más de un prestamista (D-74) y ya conoce su propia contraseña, así que `fullName`,
 * `nationalId` y `contactEmail` del pedido se ignoran. Si no, el backend genera una contraseña
 * temporal (`TempPasswordGenerator`) y da de alta a la persona con `mustChangePassword: true`
 * — el mismo mecanismo que ya usa el seed de desarrollo (`Luis Gómez`) y que documenta
 * PRODUCT.md §5: se muestra una sola vez en la respuesta, para que quien invita la pase por
 * WhatsApp, y nunca se guarda en claro. Compone `GetUserByPhoneUseCase`/`CreateUserUseCase`
 * (`auth/application`) y `CreateMembershipUseCase` (este módulo) por la capa de aplicación, no
 * una transacción: mismo riesgo asumido, ya documentado, que el resto de la cadena
 * Tenant→Lender→Membership.
 */
@Injectable()
export class InviteMembershipUseCase {
  constructor(
    private readonly getUserByPhone: GetUserByPhoneUseCase,
    private readonly createUser: CreateUserUseCase,
    private readonly createMembership: CreateMembershipUseCase,
    @Inject(TEMP_PASSWORD_GENERATOR)
    private readonly tempPasswords: TempPasswordGenerator,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
  ) {}

  /**
   * @param input - El prestamista que invita, el celular de la persona, sus roles y, si
   * aplica, su cartera.
   * @returns La membresía creada y, si la persona es nueva, su contraseña temporal.
   * @throws {@link InvalidMembershipDataError} Si los roles o la cartera no cumplen la regla, o
   * si la persona es nueva, tiene el rol `COLLECTOR` y no trae cédula.
   * @throws {@link InvalidMobilePhoneError} Si el celular no está en formato E.164.
   * @throws {@link InvalidUserDataError} Si el nombre, la cédula o el email no cumplen el
   * contrato (solo cuando la persona es nueva).
   * @throws {@link InvalidPasswordError} Si la contraseña generada no tiene la longitud
   * permitida — nunca debería pasar con {@link TempPasswordGenerator}, pero no se asume.
   * @throws {@link MembershipAlreadyExistsError} Si esa persona ya tiene una membresía con este
   * prestamista.
   */
  async execute(input: InviteMembershipInput): Promise<InvitedMembership> {
    const data = validateMembershipData({
      roles: input.roles,
      portfolioId: input.portfolioId,
    });
    const existing = await this.getUserByPhone.execute(input.phone);

    if (existing) {
      const membership = await this.createMembership.execute({
        userId: existing.id,
        lenderId: input.lenderId,
        roles: data.roles,
        portfolioId: data.portfolioId,
      });
      return {
        membership: toMembershipDetailsFromCreated(membership),
        tempPassword: null,
      };
    }

    return this.inviteNewPerson(input, data);
  }

  /**
   * Da de alta a la persona (con una contraseña temporal) y, con su id, la membresía.
   *
   * @param input - Los datos del pedido.
   * @param data - Los roles y la cartera, ya validados.
   */
  private async inviteNewPerson(
    input: InviteMembershipInput,
    data: ValidMembershipData,
  ): Promise<InvitedMembership> {
    if (data.roles.includes('COLLECTOR') && !input.nationalId) {
      throw new InvalidMembershipDataError([
        {
          path: ['nationalId'],
          message: 'La cédula es obligatoria para un cobrador nuevo.',
          params: {},
        },
      ]);
    }

    const tempPassword = this.tempPasswords.next();
    const user = await this.createUser.execute({
      phone: input.phone,
      fullName: input.fullName,
      password: tempPassword,
      nationalId: input.nationalId,
      contactEmail: input.contactEmail,
      mustChangePassword: true,
    });
    const membership = await this.createMembership.execute({
      userId: user.id,
      lenderId: input.lenderId,
      roles: data.roles,
      portfolioId: data.portfolioId,
    });

    if (user.contactEmail) {
      this.emailSender.send({
        to: user.contactEmail,
        ...membershipInviteEmail(user.fullName, user.phone, tempPassword),
      });
    }

    return {
      membership: toMembershipDetailsFromCreated(membership),
      tempPassword,
    };
  }
}
