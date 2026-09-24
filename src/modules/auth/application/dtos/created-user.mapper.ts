import type { CreatedUser } from '@/modules/auth/application/dtos/create-user.dto.js';
import type { User } from '@/modules/auth/domain/entities/user.entity.js';

/**
 * Lo que devuelve el alta de una persona: sus datos, sin la contraseña ni detalles de persistencia.
 *
 * @param user - Persona recién creada.
 * @returns Sus datos, con el celular como texto.
 */
export function toCreatedUser(user: User): CreatedUser {
  return {
    id: user.id,
    phone: user.phone.value,
    fullName: user.fullName,
    contactEmail: user.contactEmail,
    nationalId: user.nationalId,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
  };
}
