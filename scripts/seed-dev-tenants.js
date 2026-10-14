/**
 * Crea los Tenants de desarrollo con el mismo caso de uso que usará el registro
 * (`CreateTenantUseCase`), para tener con qué probar lo que se aísla por `lenderId`. Cada uno
 * necesita quién lo registra (la membresía de dueño, D-73): corre después de
 * `seed-dev-users.js`, que ya debe haber creado a esa persona. Es idempotente por nombre
 * (`Tenant.name` no tiene una restricción única en la base, a diferencia del celular de `User`,
 * así que este script consulta antes de crear).
 *
 * Necesita el código compilado (`pnpm build`, o el contenedor de desarrollo, que lo compila) y las
 * variables de entorno de la API (`.env`).
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
const { CreateTenantUseCase } =
  await import('../dist/modules/tenants/application/use-cases/create-tenant.use-case.js');
const { TENANT_REPOSITORY } =
  await import('../dist/modules/tenants/domain/tokens/tenant-repository.token.js');
const { USER_REPOSITORY } =
  await import('../dist/modules/auth/domain/tokens/user-repository.token.js');

const DEV_TENANTS = [
  { businessName: 'Préstamos Ana Pérez', ownerPhone: '+573001234567' },
];

const { READ_CACHE } =
  await import('../dist/shared/application/ports/read-cache.token.js');
const app = await NestFactory.createApplicationContext(AppModule, {
  logger: false,
});
const createTenant = app.get(CreateTenantUseCase, { strict: false });
const tenants = app.get(TENANT_REPOSITORY, { strict: false });
const users = app.get(USER_REPOSITORY, { strict: false });

for (const dev of DEV_TENANTS) {
  const existing = await tenants.findByName(dev.businessName);
  if (existing !== null) {
    console.log(`ya existe ${dev.businessName}`);
    continue;
  }
  const owner = await users.findByPhone(dev.ownerPhone);
  if (owner === null) {
    throw new Error(
      `No existe la persona del celular ${dev.ownerPhone}: corre primero seed-dev-users.js.`,
    );
  }
  const created = await createTenant.execute({
    businessName: dev.businessName,
    ownerUserId: owner.id,
  });
  console.log(
    `creado    ${dev.businessName}  tenant: ${created.tenant.id}  lender: ${created.lender.id}  membresía de dueño: ${created.ownerMembership.id}`,
  );
}
// Crea negocios sin pasar por la API: lo que la caché guardó ya no vale (D-123).
await app.get(READ_CACHE, { strict: false }).invalidateAll();
await app.close();
