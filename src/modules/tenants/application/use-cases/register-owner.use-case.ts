import { Injectable } from '@nestjs/common';
import { RecordRegistrationAcceptancesUseCase } from '@/modules/legal/application/use-cases/record-registration-acceptances.use-case.js';
import { CreateUserUseCase } from '@/modules/auth/application/use-cases/create-user.use-case.js';
import type {
  RegisterOwnerInput,
  RegisteredOwner,
} from '@/modules/tenants/application/dtos/register-owner.dto.js';
import { CreateTenantUseCase } from '@/modules/tenants/application/use-cases/create-tenant.use-case.js';

/**
 * Da de alta a quien registra su negocio: la persona (D-27) y, con su id, el Tenant, su primer
 * prestamista y su membresía de dueño con los tres roles (D-73, `CreateTenantUseCase`). Es el
 * primer camino público para los dos: hasta ahora solo existían por el seed de desarrollo
 * (`tenant-lender-membership-scope`).
 *
 * @remarks
 * Dos casos de uso seguidos, no una transacción atómica: componen por la capa de aplicación
 * (`auth` y `tenants` son módulos distintos, regla de fronteras, ARCHITECTURE.md §3), igual que
 * `CreateTenantUseCase` ya hace con `lenders` y `memberships`. Riesgo asumido: si el proceso se
 * cae justo después de crear la persona, queda una cuenta sin negocio — mismo riesgo, ya
 * aceptado, que D-72/D-73 documentan para el resto de la cadena.
 */
@Injectable()
export class RegisterOwnerUseCase {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly createTenantUseCase: CreateTenantUseCase,
    private readonly acceptances: RecordRegistrationAcceptancesUseCase,
  ) {}

  /**
   * @param input - Los datos de la persona y el nombre del negocio.
   * @returns La persona y el negocio recién creados.
   * @throws {@link OutdatedLegalVersionError} Si los documentos legales que vio ya no son los vigentes (antes de crear nada).
   * @throws {@link InvalidMobilePhoneError} Si el celular no está en formato E.164.
   * @throws {@link InvalidUserDataError} Si el nombre, la cédula o el email no cumplen el contrato.
   * @throws {@link InvalidPasswordError} Si la contraseña no tiene la longitud permitida.
   * @throws {@link WeakPasswordError} Si la contraseña es de las más usadas, un patrón o lleva el celular o la cédula.
   * @throws {@link PhoneAlreadyRegisteredError} Si el celular ya tiene cuenta.
   * @throws {@link InvalidTenantDataError} Si el nombre del negocio no cumple el contrato.
   * @throws {@link InvalidLenderDataError} Si el nombre del negocio no cumple el contrato del prestamista.
   */
  async execute(input: RegisterOwnerInput): Promise<RegisteredOwner> {
    this.acceptances.assertCurrent(input.legal.version);
    const user = await this.createUserUseCase.execute({
      phone: input.phone,
      fullName: input.fullName,
      password: input.password,
      nationalId: input.nationalId,
      contactEmail: input.contactEmail,
    });
    const tenant = await this.createTenantUseCase.execute({
      businessName: input.businessName,
      ownerUserId: user.id,
    });
    await this.acceptances.execute({
      userId: user.id,
      version: input.legal.version,
      marketing: input.legal.marketing,
      ipAddress: input.legal.ipAddress,
      userAgent: input.legal.userAgent,
    });
    return { user, tenant };
  }
}
