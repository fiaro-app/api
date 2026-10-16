import type { Role } from '@/modules/memberships/domain/entities/role.js';
import { InvalidMembershipDataError } from '@/modules/memberships/domain/errors/invalid-membership-data.error.js';

/**
 * La membresía del dueño del negocio no la toca nadie más: con dos administradores, uno no puede
 * quitarle el acceso, cambiarle los roles ni cambiarle la contraseña al dueño.
 *
 * @param roles - Los roles de la membresía sobre la que se actúa.
 * @param action - Lo que se intentó, para el mensaje («cambiar los roles de»).
 * @throws {@link InvalidMembershipDataError} Si la membresía es la del dueño.
 */
export function assertNotOwner(roles: readonly Role[], action: string): void {
  if (roles.includes('OWNER')) {
    throw new InvalidMembershipDataError([
      {
        path: ['id'],
        message: `No se puede ${action} la membresía del dueño del negocio.`,
        params: {},
      },
    ]);
  }
}
