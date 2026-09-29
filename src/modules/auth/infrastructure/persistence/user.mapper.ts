import type { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import type { UserModel } from '@/shared/infrastructure/persistence/generated/models.js';
import { User } from '@/modules/auth/domain/entities/user.entity.js';
import { technicalEmailFor } from '@/modules/auth/infrastructure/better-auth/technical-email.js';
import { MobilePhone } from '@/shared/domain/value-objects/mobile-phone.value-object.js';

/** Proveedor de la cuenta que guarda el hash de la contraseña (el nombre lo fija better-auth). */
export const CREDENTIAL_PROVIDER = 'credential';

/**
 * La fila de `users` y su cuenta de credencial. Prisma las inserta en una sola transacción, y
 * `accountId` es el propio usuario porque la credencial no viene de un proveedor externo.
 *
 * @param user - Persona nueva.
 * @param credentialAccountId - Identificador de la fila de la cuenta de credencial.
 * @param passwordHash - Hash de la contraseña.
 */
export function toUserCreateInput(
  user: User,
  credentialAccountId: string,
  passwordHash: string,
): Prisma.UserCreateInput {
  return {
    id: user.id,
    fullName: user.fullName,
    phone: user.phone.value,
    loginEmail: technicalEmailFor(user.phone.value),
    contactEmail: user.contactEmail,
    nationalId: user.nationalId,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
    accounts: {
      create: {
        id: credentialAccountId,
        accountId: user.id,
        providerId: CREDENTIAL_PROVIDER,
        password: passwordHash,
        createdAt: user.createdAt,
      },
    },
  };
}

/**
 * La fila de `users` como la entidad de dominio. El celular ya se validó al guardarlo, así que
 * `MobilePhone.parse` siempre lo acepta.
 *
 * @param row - Fila de `users`.
 */
export function toUser(row: UserModel): User {
  return User.create({
    id: row.id,
    phone: MobilePhone.parse(row.phone),
    fullName: row.fullName,
    contactEmail: row.contactEmail,
    nationalId: row.nationalId,
    mustChangePassword: row.mustChangePassword,
    createdAt: row.createdAt,
  });
}
