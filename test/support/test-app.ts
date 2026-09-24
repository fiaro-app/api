import type { Type } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '@/app.module.js';
import { configureApp } from '@/app.setup.js';
import { type Env, loadEnv } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';
import type { CreateUserInput } from '@/modules/auth/application/dtos/create-user.dto.js';
import { CreateUserUseCase } from '@/modules/auth/application/use-cases/create-user.use-case.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';
import { testEnvSource } from '@test/support/test-env.js';

export interface TestAppOptions {
  /** Variables de entorno que cambian a las de las pruebas (`testEnvSource`). */
  readonly env?: NodeJS.ProcessEnv;
  /** Valores ya validados que reemplazan a los de `env`, por ejemplo un rate limit distinto. */
  readonly overrides?: Partial<Env>;
  /** Controllers de prueba que se suman a los de la aplicación. */
  readonly controllers?: Type[];
}

export interface TestApp {
  readonly app: NestExpressApplication;
  readonly http: ReturnType<typeof request>;
  readonly prisma: PrismaService;
  /** Da de alta a una persona con el mismo caso de uso que usará el registro. */
  createUser(input: CreateUserInput): ReturnType<CreateUserUseCase['execute']>;
  close(): Promise<void>;
}

/**
 * Levanta la aplicación ensamblada (`AppModule` y `configureApp`, como `main.ts`) sobre la base de
 * datos de la corrida, vaciada: cada prueba empieza sin usuarios ni sesiones.
 */
export async function startTestApp(
  options: TestAppOptions = {},
): Promise<TestApp> {
  const env: Env = {
    ...loadEnv(testEnvSource(options.env)),
    ...options.overrides,
  };
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: options.controllers ?? [],
  })
    .overrideProvider(ENV)
    .useValue(env)
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({
    logger: false,
  });
  configureApp(app);
  await app.init();

  const prisma = app.get(PrismaService, { strict: false });
  await prisma.$executeRaw`TRUNCATE TABLE "users", "verifications" CASCADE`;

  const createUseCase = app.get(CreateUserUseCase, { strict: false });
  return {
    app,
    http: request(app.getHttpServer()),
    prisma,
    createUser: (input) => createUseCase.execute(input),
    close: () => app.close(),
  };
}
