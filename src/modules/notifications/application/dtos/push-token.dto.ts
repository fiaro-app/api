/** Datos con los que se registra o se quita el token de un dispositivo (D-95). */
export interface PushTokenInput {
  /** La persona de la sesión, nunca la que viene en el cuerpo de la petición. */
  readonly userId: string;
  /** Token de Expo del dispositivo, con la forma `ExponentPushToken[...]`. */
  readonly token: string;
}
