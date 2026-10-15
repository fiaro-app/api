import { Body, Controller, Post } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ApiErrorSchema } from '@fiaro-app/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { CreateUserInput } from '@/modules/auth/application/dtos/create-user.dto.js';
import { CreateUserUseCase } from '@/modules/auth/application/use-cases/create-user.use-case.js';
import { Public } from '@/shared/infrastructure/http/public.decorator.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

const AnyBodySchema = z.record(z.string(), z.unknown());

/**
 * Ruta de prueba que llama al caso de uso de alta de personas con lo que reciba, sin validarlo
 * antes con un schema: así llegan al dominio los datos que el contrato habría rechazado y se ve
 * cómo responde la API a cada error de dominio.
 */
@Public()
@Controller('probe')
class CreateUserProbeController {
  constructor(private readonly moduleRef: ModuleRef) {}

  @Post('users')
  async create(@Body({ schema: AnyBodySchema }) body: Record<string, unknown>) {
    const useCase = this.moduleRef.get(CreateUserUseCase, { strict: false });
    return await useCase.execute(body as unknown as CreateUserInput);
  }
}

const VALID = {
  phone: '+573001234567',
  fullName: 'Ana Pérez',
  password: 'contraseña-de-prueba-1',
};

let running: TestApp | undefined;

afterEach(async () => {
  await running?.close();
  running = undefined;
});

async function start() {
  running = await startTestApp({ controllers: [CreateUserProbeController] });
  return running;
}

describe('los errores de dominio salen por HTTP', () => {
  it('un alta válida responde 201 con la persona, sin la contraseña', async () => {
    const app = await start();

    const { body } = await app.http
      .post('/probe/users')
      .send(VALID)
      .expect(201);

    expect(body).toMatchObject({ phone: VALID.phone, fullName: 'Ana Pérez' });
    expect(JSON.stringify(body)).not.toContain(VALID.password);
  });

  it('un celular que ya tiene cuenta responde 409 PHONE_ALREADY_REGISTERED', async () => {
    const app = await start();
    await app.http.post('/probe/users').send(VALID).expect(201);

    const { body } = await app.http
      .post('/probe/users')
      .send(VALID)
      .expect(409);

    expect(body).toMatchObject(ApiErrorSchema.parse(body));
    expect(body).toMatchObject({
      statusCode: 409,
      code: 'PHONE_ALREADY_REGISTERED',
      message: 'Ya existe una cuenta con ese celular.',
      path: '/probe/users',
      issues: null,
    });
    expect(await app.prisma.user.count()).toBe(1);
  });

  it('un celular que no es colombiano responde 400 INVALID_PHONE', async () => {
    const app = await start();

    const { body } = await app.http
      .post('/probe/users')
      .send({ ...VALID, phone: '3001234567' })
      .expect(400);

    expect(body).toMatchObject({
      statusCode: 400,
      code: 'INVALID_PHONE',
      message:
        'El celular debe ser colombiano y estar en formato internacional, por ejemplo +573001234567.',
    });
  });

  it('una contraseña de longitud inválida responde 400 con el rango en el mensaje', async () => {
    const app = await start();

    const { body } = await app.http
      .post('/probe/users')
      .send({ ...VALID, password: 'corta' })
      .expect(400);

    expect(body).toMatchObject({
      code: 'INVALID_PASSWORD_LENGTH',
      message: 'La contraseña debe tener entre 15 y 128 caracteres.',
    });
  });

  it('unos datos de la persona inválidos responden 400 VALIDATION_FAILED con un texto por campo', async () => {
    const app = await start();

    const { body } = await app.http
      .post('/probe/users')
      .send({
        ...VALID,
        fullName: 'A',
        contactEmail: 'ana@',
        nationalId: 'abc',
      })
      .expect(400);

    expect(body).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      message: 'Los datos enviados no son válidos.',
    });
    expect(body.issues).toEqual([
      { path: ['fullName'], message: 'La longitud mínima es 2.' },
      { path: ['email'], message: 'Ingresa un correo válido.' },
      {
        path: ['nationalId'],
        message: 'Ingresa una cédula válida: solo números, sin puntos.',
      },
    ]);
    expect(await app.prisma.user.count()).toBe(0);
  });

  it('un error de dominio no revela el mensaje del error ni deja rastro de un 500', async () => {
    const app = await start();
    await app.http.post('/probe/users').send(VALID).expect(201);

    const { body } = await app.http
      .post('/probe/users')
      .send(VALID)
      .expect(409);

    expect(JSON.stringify(body)).not.toContain('INTERNAL_ERROR');
    expect(body.message).toBe('Ya existe una cuenta con ese celular.');
  });
});
