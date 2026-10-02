import type { User } from '@/modules/auth/domain/entities/user.entity.js';

/** Los datos del perfil que se pueden reemplazar. */
export interface ProfileUpdate {
  /** Nombre completo, ya normalizado. */
  readonly fullName: string;
  /** Correo real de la persona, o `null` si se quita. */
  readonly contactEmail: string | null;
  /** Si sigue siendo el mismo correo verificado: `false` cuando cambia o se quita. */
  readonly contactEmailVerified: boolean;
}

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
   * @param id - Identificador de la persona.
   * @returns La persona, o `null` si no existe.
   */
  findById(id: string): Promise<User | null>;

  /**
   * Reemplaza el hash de la contraseña de la credencial de la persona.
   *
   * @param userId - La persona.
   * @param passwordHash - Hash de la contraseña nueva; la contraseña en claro nunca llega aquí.
   */
  updatePassword(userId: string, passwordHash: string): Promise<void>;

  /**
   * Como {@link updatePassword}, pero además marca `mustChangePassword`: la contraseña nueva es
   * temporal y la persona debe cambiarla al entrar, mismo criterio que un alta (D-81).
   *
   * @param userId - La persona.
   * @param passwordHash - Hash de la contraseña temporal; la contraseña en claro nunca llega aquí.
   */
  resetToTemporaryPassword(userId: string, passwordHash: string): Promise<void>;

  /**
   * Marca el correo de contacto de la persona como verificado.
   *
   * @param userId - La persona.
   */
  markContactEmailVerified(userId: string): Promise<void>;

  /**
   * Reemplaza el nombre y el correo de contacto de la persona.
   *
   * @param userId - La persona.
   * @param update - Los datos nuevos, ya validados.
   */
  updateProfile(userId: string, update: ProfileUpdate): Promise<void>;

  /**
   * @param userId - La persona.
   * @returns El hash de la contraseña de su credencial, o `null` si no tiene una.
   */
  findPasswordHash(userId: string): Promise<string | null>;

  /**
   * Marca la cuenta como desactivada (baja lógica): no borra nada.
   *
   * @param userId - La persona.
   * @param deactivatedAt - Cuándo se desactivó.
   */
  deactivate(userId: string, deactivatedAt: Date): Promise<void>;
}
