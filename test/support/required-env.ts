/** Lo mínimo que exige la configuración; cada prueba agrega o cambia lo que ejercita. */
export const REQUIRED_ENV = {
  DATABASE_URL: 'postgresql://fiaro:fiaro@localhost:5440/fiaro',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost:3040',
};

/** Lo que además exige la configuración en producción: la auditoría durable (Redis y MongoDB). */
export const PRODUCTION_ENV = {
  REDIS_URL: 'redis://localhost:6390',
  MONGODB_URI: 'mongodb://fiaro:fiaro@localhost:27040/fiaro?authSource=admin',
};
