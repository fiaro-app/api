import type { PushToken } from '@/modules/notifications/domain/entities/push-token.entity.js';

/** Guarda los tokens de los dispositivos a los que se les manda una notificación push (D-95). */
export interface PushTokenRepository {
  /**
   * Registra el token de un dispositivo para una persona. Si ese token ya existía, lo reasigna a
   * esa persona y actualiza su fecha: un dispositivo con otra sesión deja de recibir a la anterior.
   *
   * @param pushToken - El token a registrar.
   */
  upsert(pushToken: PushToken): Promise<void>;

  /**
   * @param userId - La persona.
   * @returns Los tokens de sus dispositivos, del primero registrado al último.
   */
  listByUser(userId: string): Promise<readonly PushToken[]>;

  /**
   * Quita el token solo si pertenece a esa persona. Si es de otra, no hace nada: no se puede
   * desregistrar el dispositivo de otra sesión.
   *
   * @param userId - La persona que pide quitarlo.
   * @param token - El token a quitar.
   */
  deleteForUser(userId: string, token: string): Promise<void>;

  /**
   * Quita el token sin importar de quién es. Lo usa el envío cuando Expo responde que el
   * dispositivo ya no existe (`DeviceNotRegistered`).
   *
   * @param token - El token a quitar.
   */
  deleteByToken(token: string): Promise<void>;
}
