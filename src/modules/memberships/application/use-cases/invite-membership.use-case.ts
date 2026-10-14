import { normalizeNationalId } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import type { CreatedUser } from '@/modules/auth/application/dtos/create-user.dto.js';
import { AdminResetPasswordUseCase } from '@/modules/auth/application/use-cases/admin-reset-password.use-case.js';
import { CreateUserUseCase } from '@/modules/auth/application/use-cases/create-user.use-case.js';
import { GetUserByPhoneUseCase } from '@/modules/auth/application/use-cases/get-user-by-phone.use-case.js';
import type {
  InvitedMembership,
  InviteMembershipInput,
} from '@/modules/memberships/application/dtos/invite-membership.dto.js';
import { toMembershipDetailsFromCreated } from '@/modules/memberships/application/dtos/membership-details.mapper.js';
import {
  CollectorSeats,
  occupiesCollectorSeat,
} from '@/modules/memberships/application/services/collector-seats.js';
import {
  validateMembershipData,
  type ValidMembershipData,
} from '@/modules/memberships/application/services/membership-data.validator.js';
import { CreateMembershipUseCase } from '@/modules/memberships/application/use-cases/create-membership.use-case.js';
import { CollaboratorNationalIdTakenError } from '@/modules/memberships/domain/errors/collaborator-national-id-taken.error.js';
import { InvalidMembershipDataError } from '@/modules/memberships/domain/errors/invalid-membership-data.error.js';
import { MembershipAlreadyExistsError } from '@/modules/memberships/domain/errors/membership-already-exists.error.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';
import { MEMBERSHIP_REPOSITORY } from '@/modules/memberships/domain/tokens/membership-repository.token.js';
import { membershipInviteEmail } from '@/modules/memberships/domain/notifications/membership-invite-email.js';
import type { EmailSender } from '@/modules/notifications/application/ports/email-sender.port.js';
import { EMAIL_SENDER } from '@/modules/notifications/application/ports/email-sender.token.js';
import type { LenderLock } from '@/shared/application/ports/lender-lock.port.js';
import { LENDER_LOCK } from '@/shared/application/ports/lender-lock.token.js';
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
 *
 * Todo el alta corre con el candado del prestamista (`LenderLock`) tomado, porque antes de crear
 * revisa tres reglas que dos peticiones simultáneas pasarían a la vez: que la persona no tenga ya
 * una membresía aquí, que nadie más del negocio tenga esa cédula (la regla es por prestamista: la
 * misma persona puede trabajar para otro) y que quede un cupo de cobrador en el plan (el dueño no
 * ocupa cupo). Si un alta anterior se cayó entre crear la persona y crear la membresía, la persona
 * existe sin membresías y con la contraseña temporal sin cambiar: se completa el alta y se le da
 * una contraseña temporal nueva, para que quien invita no se quede sin ella.
 */
@Injectable()
export class InviteMembershipUseCase {
  constructor(
    private readonly getUserByPhone: GetUserByPhoneUseCase,
    private readonly createUser: CreateUserUseCase,
    private readonly createMembership: CreateMembershipUseCase,
    private readonly adminResetPassword: AdminResetPasswordUseCase,
    private readonly collectorSeats: CollectorSeats,
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly memberships: MembershipRepository,
    @Inject(LENDER_LOCK) private readonly lenderLock: LenderLock,
    @Inject(TEMP_PASSWORD_GENERATOR)
    private readonly tempPasswords: TempPasswordGenerator,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
  ) {}

  /**
   * @param input - El prestamista que invita, el celular de la persona, sus roles y, si
   * aplica, su cartera.
   * @returns La membresía creada y, si la persona es nueva, su contraseña temporal.
   * @throws {@link InvalidMembershipDataError} Si los roles o la cartera no cumplen la regla, o
   * si la persona es nueva, tiene el rol `COLLECTOR` y no trae cédula o correo.
   * @throws {@link InvalidMobilePhoneError} Si el celular no está en formato E.164.
   * @throws {@link InvalidUserDataError} Si el nombre, la cédula o el email no cumplen el
   * contrato (solo cuando la persona es nueva).
   * @throws {@link InvalidPasswordError} Si la contraseña generada no tiene la longitud
   * permitida — nunca debería pasar con {@link TempPasswordGenerator}, pero no se asume.
   * @throws {@link CollaboratorNationalIdTakenError} Si otra persona del negocio tiene esa cédula.
   * @throws {@link CollectorLimitReachedError} Si la persona ocuparía un cupo de cobrador del plan
   * y no queda ninguno.
   * @throws {@link MembershipAlreadyExistsError} Si esa persona ya tiene una membresía con este
   * prestamista.
   */
  async execute(input: InviteMembershipInput): Promise<InvitedMembership> {
    const data = validateMembershipData({
      roles: input.roles,
      portfolioId: input.portfolioId,
    });
    return this.lenderLock.runExclusive(input.lenderId, () =>
      this.inviteExclusively(input, data),
    );
  }

  /** El alta en sí, con el candado del prestamista ya tomado. */
  private async inviteExclusively(
    input: InviteMembershipInput,
    data: ValidMembershipData,
  ): Promise<InvitedMembership> {
    const existing = await this.getUserByPhone.execute(input.phone);
    await this.assertCanJoin(input.lenderId, data, existing, input.nationalId);

    if (existing === null) {
      return this.inviteNewPerson(input, data);
    }
    const interrupted = await this.isInterruptedInvite(existing);
    const membership = await this.createMembership.execute({
      userId: existing.id,
      lenderId: input.lenderId,
      roles: data.roles,
      portfolioId: data.portfolioId,
    });
    return {
      membership: toMembershipDetailsFromCreated(membership),
      tempPassword: interrupted
        ? await this.adminResetPassword.execute(existing.id)
        : null,
    };
  }

  /**
   * Revisa, antes de crear nada, que la persona pueda sumarse al negocio.
   *
   * @throws {@link MembershipAlreadyExistsError} Si ya tiene una membresía aquí.
   * @throws {@link CollaboratorNationalIdTakenError} Si otra persona del negocio tiene esa cédula.
   * @throws {@link CollectorLimitReachedError} Si ocuparía un cupo de cobrador y no queda ninguno.
   */
  private async assertCanJoin(
    lenderId: string,
    data: ValidMembershipData,
    existing: CreatedUser | null,
    requestedNationalId: string | null | undefined,
  ): Promise<void> {
    const nationalId = existing ? existing.nationalId : requestedNationalId;
    if (nationalId) {
      const holder = await this.memberships.findByLenderAndNationalId(
        lenderId,
        normalizeNationalId(nationalId),
      );
      if (holder) {
        throw holder.userId === existing?.id
          ? new MembershipAlreadyExistsError()
          : new CollaboratorNationalIdTakenError();
      }
    }
    if (occupiesCollectorSeat(data.roles)) {
      await this.collectorSeats.assertAvailable(lenderId);
    }
  }

  /** Una persona creada por un alta que se cayó antes de su membresía: sin ninguna y sin estrenar. */
  private async isInterruptedInvite(user: CreatedUser): Promise<boolean> {
    if (!user.mustChangePassword) {
      return false;
    }
    return (await this.memberships.findActiveByUserId(user.id)).length === 0;
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
    if (data.roles.includes('COLLECTOR')) {
      assertNewCollectorData(input);
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

/**
 * Un cobrador nuevo necesita cédula y correo: el correo es por donde le llegan su contraseña
 * temporal y los avisos de la app (D-94), así que no puede quedar sin él (D-120).
 *
 * @param input - Los datos del pedido.
 * @throws {@link InvalidMembershipDataError} Con un issue por cada dato que falte.
 */
function assertNewCollectorData(input: InviteMembershipInput): void {
  const issues = [
    ...(input.nationalId
      ? []
      : [
          {
            path: ['nationalId'],
            message: 'La cédula es obligatoria para un cobrador nuevo.',
            params: {},
          },
        ]),
    ...(input.contactEmail
      ? []
      : [
          {
            path: ['contactEmail'],
            message: 'El correo es obligatorio para un cobrador nuevo.',
            params: {},
          },
        ]),
  ];
  if (issues.length > 0) {
    throw new InvalidMembershipDataError(issues);
  }
}
