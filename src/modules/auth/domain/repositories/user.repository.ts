import type { User } from '@/modules/auth/domain/entities/user.entity.js';

/** Puerto de persistencia de las personas que inician sesión. */
export interface UserRepository {
  /**
   * Guarda la persona y su credencial de acceso en una sola operación: nunca queda un usuario
   * sin contraseña.
   *
   * @param user - Persona nueva.
   * @param passwordHash - Hash de su contraseña; la contraseña en claro nunca llega aquí.
   * @throws {@link PhoneAlreadyRegisteredError} Si el celular ya tiene cuenta.
   */
  create(user: User, passwordHash: string): Promise<void>;
}
