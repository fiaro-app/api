/** Lo mínimo que exige la configuración; cada prueba agrega o cambia lo que ejercita. */
export const REQUIRED_ENV = {
  DATABASE_URL: 'postgresql://fiaro:fiaro@localhost:5440/fiaro',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost:3040',
};

/**
 * Lo que además exige la configuración en producción: la auditoría durable (Redis y MongoDB), el
 * envío de correos (Resend) y el version-gate de la app móvil.
 */
export const PRODUCTION_ENV = {
  REDIS_URL: 'redis://localhost:6390',
  MONGODB_URI: 'mongodb://fiaro:fiaro@localhost:27040/fiaro?authSource=admin',
  RESEND_API_KEY: 're_test_00000000000000000000000000',
  RESEND_FROM_EMAIL: 'Fiaro <no-reply@fiaro.example>',
  MOBILE_MIN_SUPPORTED_VERSION: '1.0.0',
  MOBILE_LATEST_VERSION: '1.0.0',
  MOBILE_DOWNLOAD_URL: 'https://example.com/fiaro.apk',
};
