/**
 * Intentos de iniciar sesión con un mismo celular que se dejan pasar dentro de la ventana: el
 * siguiente se bloquea sin comprobar la contraseña. Con 5, quien adivina contraseñas de un celular
 * agota sus intentos aunque cambie de IP, y una persona que se equivoca un par de veces no se entera.
 */
export const SIGN_IN_MAX_ATTEMPTS = 5;

/**
 * Cuánto dura la ventana de intentos, en segundos (15 minutos). Empieza con el primer intento y, si
 * se agotan los intentos, el bloqueo dura hasta que termina: pasado ese tiempo el celular vuelve a
 * tener todos sus intentos. Un inicio de sesión que sale bien la reinicia.
 */
export const SIGN_IN_WINDOW_SECONDS = 15 * 60;
