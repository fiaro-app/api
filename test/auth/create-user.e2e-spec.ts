import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { PhoneAlreadyRegisteredError } from '@/modules/auth/domain/errors/phone-already-registered.error.js';
import {
  PASSWORD,
  PHONE,
  signIn,
  useAuthApp,
} from '@test/support/auth-flow.js';

const { startWithUser, startEmpty } = useAuthApp();

describe('dar de alta a una persona (CreateUserUseCase)', () => {
  it('guarda el hash de la contraseña, nunca la contraseña, en la cuenta de credencial', async () => {
    const app = await startWithUser();

    const user = await app.prisma.user.findUniqueOrThrow({
      where: { phone: PHONE },
    });
    const account = await app.prisma.account.findFirstOrThrow({
      where: { userId: user.id },
    });

    expect(account.providerId).toBe('credential');
    expect(account.accountId).toBe(user.id);
    expect(account.password).not.toBe(PASSWORD);
    expect(account.password).not.toContain(PASSWORD);
    expect(account.password).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
  });

  it('guarda un email técnico derivado del celular y el email real aparte', async () => {
    const app = await startEmpty();
    await app.createUser({
      phone: PHONE,
      fullName: 'Ana Pérez',
      password: PASSWORD,
      contactEmail: 'ana@example.com',
      nationalId: '1020304050',
    });

    const user = await app.prisma.user.findUniqueOrThrow({
      where: { phone: PHONE },
    });

    expect(user.loginEmail).toBe('573001234567@phone.fiaro.invalid');
    expect(user.contactEmail).toBe('ana@example.com');
    expect(user.nationalId).toBe('1020304050');
  });

  it('el celular es único: la segunda alta falla y no deja filas a medias', async () => {
    const app = await startWithUser();

    await expect(
      app.createUser({
        phone: PHONE,
        fullName: 'Otra Persona',
        password: PASSWORD,
      }),
    ).rejects.toBeInstanceOf(PhoneAlreadyRegisteredError);

    expect(await app.prisma.user.count()).toBe(1);
    expect(await app.prisma.account.count()).toBe(1);
  });

  it('dos altas simultáneas del mismo celular: solo una prospera', async () => {
    const app = await startEmpty();
    const input = { phone: PHONE, fullName: 'Ana Pérez', password: PASSWORD };

    const results = await Promise.allSettled([
      app.createUser(input),
      app.createUser(input),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([
      'fulfilled',
      'rejected',
    ]);
    expect(await app.prisma.user.count()).toBe(1);
  });

  it('la base de datos rechaza un celular que no es E.164 aunque se salte el caso de uso', async () => {
    const app = await startEmpty();

    await expect(
      app.prisma
        .$executeRaw`INSERT INTO "users" ("id", "full_name", "phone", "login_email", "updated_at") VALUES (${randomUUID()}::uuid, 'X', '+57123', 'x@phone.fiaro.invalid', now())`,
    ).rejects.toThrow(/users_phone_co_mobile_e164_check/);
  });

  it('el usuario creado con el caso de uso puede iniciar sesión de inmediato', async () => {
    const app = await startEmpty();
    await app.createUser({
      phone: '+573209998877',
      fullName: 'Luis',
      password: 'otra-contraseña-9',
    });

    const response = await signIn(app, {
      phone: '+573209998877',
      password: 'otra-contraseña-9',
    });

    expect(response.status).toBe(200);
  });
});
