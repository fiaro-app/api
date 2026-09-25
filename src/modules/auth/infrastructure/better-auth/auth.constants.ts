/** Prefijo de las rutas de better-auth: `/auth/sign-in/phone-number`, `/auth/get-session`... */
export const AUTH_BASE_PATH = '/auth';

/**
 * Cabecera interna con la IP del cliente. La escribe el controller con `req.ip` (la que resuelve
 * Express según `TRUST_PROXY`) y better-auth cuenta el rate limit con ella, así que ambos
 * sistemas ven la misma IP y un cliente no puede falsificarla enviando la cabecera.
 */
export const CLIENT_IP_HEADER = 'x-fiaro-client-ip';

/** Ruta de better-auth para iniciar sesión con celular y contraseña. */
export const SIGN_IN_PATH = '/sign-in/phone-number';

/** Ruta de better-auth para ver la sesión de la cookie. */
export const GET_SESSION_PATH = '/get-session';

/** Ruta de better-auth para cerrar la sesión de la cookie. */
export const SIGN_OUT_PATH = '/sign-out';

/** Ruta de better-auth para cambiar la contraseña con una sesión abierta. */
export const CHANGE_PASSWORD_PATH = '/change-password';

/** Ruta de better-auth para cerrar todas las sesiones de la persona salvo la de la cookie. */
export const REVOKE_OTHER_SESSIONS_PATH = '/revoke-other-sessions';

/** Ruta de better-auth para cerrar todas las sesiones de la persona, la de la cookie incluida. */
export const REVOKE_SESSIONS_PATH = '/revoke-sessions';
