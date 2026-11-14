/**
 * Crea las personas de desarrollo con el mismo caso de uso que usará el registro
 * (`CreateUserUseCase`), para tener con quién iniciar sesión. Es idempotente: las que ya
 * existen se dejan como están.
 *
 * Necesita el código compilado (`pnpm build`, o el contenedor de desarrollo, que lo compila) y las
 * variables de entorno de la API (`.env`). Solo para desarrollo: las contraseñas son públicas.
 */
import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}
if (process.env.NODE_ENV === 'production') {
  throw new Error(
    'El seed es solo para desarrollo: no se ejecuta en producción.',
  );
}

const { AppModule } = await import('../dist/app.module.js');
const { CreateUserUseCase } =
  await import('../dist/modules/auth/application/use-cases/create-user.use-case.js');

const DEV_USERS = [
  {
    phone: '+573001234567',
    fullName: 'Ana Pérez',
    password: 'fiaro-dev-2026-ana', // NOSONAR: contraseña de desarrollo, pública a propósito (ver el comentario del archivo).
    nationalId: '1020304050',
    contactEmail: 'ana@fiaro.dev',
  },
  {
    phone: '+573109998877',
    fullName: 'Luis Gómez (cobrador nuevo)',
    password: 'temporal-2026-luis', // NOSONAR: contraseña de desarrollo, pública a propósito.
    nationalId: '1030405060',
    mustChangePassword: true,
  },
  {
    phone: '+573112223344',
    fullName: 'Carla Ruiz (cuenta de prueba, se puede desactivar)',
    password: 'cuenta-de-prueba-2026', // NOSONAR: contraseña de desarrollo, pública a propósito.
    nationalId: '1050607080',
  },
];

const app = await NestFactory.createApplicationContext(AppModule, {
  logger: false,
});
const createUser = app.get(CreateUserUseCase, { strict: false });

for (const user of DEV_USERS) {
  try {
    await createUser.execute(user);
    console.log(
      `creado    ${user.phone}  ${user.fullName}  contraseña: ${user.password}`,
    );
  } catch (error) {
    if (error.code !== 'PHONE_ALREADY_REGISTERED') {
      throw error;
    }
    console.log(`ya existe ${user.phone}  ${user.fullName}`);
  }
}
await app.close();
