import { SESSION_COOKIE_NAME } from '@/shared/infrastructure/http/session-cookie.js';

/** Grupo de rutas en la documentación: su nombre en `@ApiTags()` y lo que explica de él. */
export interface ApiTagDefinition {
  /** Nombre del grupo, tal como aparece en la documentación. */
  readonly name: string;
  /** Lo que explica el grupo, en Markdown. */
  readonly description: string;
}

/**
 * Grupos de la documentación de la API. Viven aquí, y no en cada módulo, para que la
 * configuración de Swagger los conozca sin depender de ningún módulo; cada controller usa el
 * nombre con `@ApiTags(API_TAGS.<grupo>.name)`.
 */
export const API_TAGS = {
  auth: {
    name: 'Autenticación',
    description: `Inicio de sesión con celular y contraseña. La sesión viaja en la cookie \`${SESSION_COOKIE_NAME}\` (\`HttpOnly\`, \`SameSite=Lax\`, 30 días) y cada día de uso la renueva. Las apps móviles usan el cliente de better-auth con su plugin de Expo, que guarda la cookie cifrada en el dispositivo. Un cobrador con contraseña temporal solo puede ver su sesión, cambiar la contraseña y cerrar sesión.`,
  },
  account: {
    name: 'Cuenta',
    description:
      'Gestión de la propia cuenta con sesión abierta: verificar el correo de contacto, actualizar el perfil y desactivar la cuenta.',
  },
} as const satisfies Record<string, ApiTagDefinition>;
