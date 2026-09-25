import { expo } from '@better-auth/expo';
import { MobilePhoneSchema } from '@fiaro-app/contracts';
import { phoneNumber } from 'better-auth/plugins';

/**
 * Rutas de código por SMS que trae el plugin de celular. Están apagadas: en el MVP el celular no
 * se verifica; quien lo escribe (el dueño al registrarse, el prestamista al dar de alta a un
 * cobrador) es quien responde por él.
 */
export const DISABLED_PATHS = [
  '/phone-number/send-otp',
  '/phone-number/verify',
  '/phone-number/request-password-reset',
  '/phone-number/reset-password',
] as const;

/**
 * Plugins de better-auth: inicio de sesión con celular colombiano (`+573001234567`) y el de Expo,
 * que hace que las apps móviles pasen la comprobación de origen con la cabecera `expo-origin`.
 *
 * @remarks
 * Devuelve una tupla (`as const`) para que TypeScript conserve el tipo de cada plugin: de ahí
 * sale que `user.phoneNumber` exista en la sesión.
 */
export function authPlugins() {
  return [
    phoneNumber({
      phoneNumberValidator: (value) =>
        MobilePhoneSchema.safeParse(value).success,
      sendOTP: () => {
        throw new Error(
          'La verificación del celular por código no está habilitada.',
        );
      },
      schema: {
        user: {
          fields: {
            phoneNumber: 'phone',
            phoneNumberVerified: 'phoneVerified',
          },
        },
      },
    }),
    expo(),
  ] as const;
}
