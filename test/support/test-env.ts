/**
 * Variables de entorno de la aplicación en las pruebas e2e. `DATABASE_URL` la publica el
 * `globalSetup` (una base de datos por corrida); `TRUST_PROXY=1` deja que cada prueba se
 * identifique con su propia IP en `X-Forwarded-For` y así no comparta el rate limit con las demás.
 */
export function testEnvSource(
  extra: NodeJS.ProcessEnv = {},
): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'test',
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: 'secreto-solo-para-pruebas-e2e-0123456789',
    BETTER_AUTH_URL: 'http://localhost:3000',
    MOBILE_APP_SCHEMES: 'fiaro',
    TRUST_PROXY: '1',
    ...extra,
  };
}
