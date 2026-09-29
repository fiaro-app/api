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

  /**
   * @param phone - Celular en formato E.164.
   * @returns La persona con ese celular, o `null` si no tiene cuenta.
   */
  findByPhone(phone: string): Promise<User | null>;

  /**
   * Reemplaza el hash de la contraseña de la credencial de la persona.
   *
   * @param userId - La persona.
   * @param passwordHash - Hash de la contraseña nueva; la contraseña en claro nunca llega aquí.
   */
  updatePassword(userId: string, passwordHash: string): Promise<void>;
}
