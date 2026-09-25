import type { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import type { User } from '@/modules/auth/domain/entities/user.entity.js';
import { technicalEmailFor } from '@/modules/auth/infrastructure/better-auth/technical-email.js';

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
