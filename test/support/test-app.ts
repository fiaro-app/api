import type { Type } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { DestinationStream } from 'pino';
import request from 'supertest';
import { AppModule } from '@/app.module.js';
import { configureApp } from '@/app.setup.js';
import { type Env, loadEnv } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';
import type { CreateUserInput } from '@/modules/auth/application/dtos/create-user.dto.js';
import { CreateUserUseCase } from '@/modules/auth/application/use-cases/create-user.use-case.js';
import { EMAIL_SENDER } from '@/modules/notifications/application/ports/email-sender.token.js';
import { PUSH_SENDER } from '@/modules/notifications/application/ports/push-sender.token.js';
import type { FlatCatalogs } from '@/shared/infrastructure/i18n/message-catalog.js';
import { TranslationService } from '@/shared/infrastructure/i18n/translation.service.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';
import { listenOnLoopback } from '@test/support/loopback.js';
import { RecordingEmailSender } from '@test/support/recording-email-sender.js';
import { RecordingPushSender } from '@test/support/recording-push-sender.js';
import { testEnvSource } from '@test/support/test-env.js';

export interface TestAppOptions {
  /** Variables de entorno que cambian a las de las pruebas (`testEnvSource`). */
  readonly env?: NodeJS.ProcessEnv;
  /** Valores ya validados que reemplazan a los de `env`, por ejemplo un rate limit distinto. */
  readonly overrides?: Partial<Env>;
  /** Controllers de prueba que se suman a los de la aplicación. */
  readonly controllers?: Type[];
  /** Dónde se escriben los logs (`captureLogs`); por defecto la salida estándar. */
  readonly logDestination?: DestinationStream;
  /** Idiomas que negocia `Accept-Language`; solo para probar más de uno (`configureApp`). */
  readonly languages?: readonly string[];
  /** Catálogos que reemplazan a los reales; solo para probar más de un idioma. */
  readonly catalogs?: FlatCatalogs;
}

export interface TestApp {
  readonly app: NestExpressApplication;
  readonly http: ReturnType<typeof request>;
  readonly prisma: PrismaService;
  /** Da de alta a una persona con el mismo caso de uso que usará el registro. */
  createUser(input: CreateUserInput): ReturnType<CreateUserUseCase['execute']>;
  /** Los correos que la aplicación pidió enviar; no salen de verdad (`RecordingEmailSender`). */
  readonly emails: RecordingEmailSender;
  /** Los push que la aplicación pidió enviar; no salen de verdad (`RecordingPushSender`). */
  readonly pushes: RecordingPushSender;
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
  const emails = new RecordingEmailSender();
  const pushes = new RecordingPushSender();
  const builder = Test.createTestingModule({
    imports: [AppModule],
    controllers: options.controllers ?? [],
  })
    .overrideProvider(ENV)
    .useValue(env)
    .overrideProvider(EMAIL_SENDER)
    .useValue(emails)
    .overrideProvider(PUSH_SENDER)
    .useValue(pushes);
  if (options.catalogs !== undefined) {
    builder
      .overrideProvider(TranslationService)
      .useValue(new TranslationService(options.catalogs));
  }
  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({
    logger: false,
  });
  configureApp(app, {
    logDestination: options.logDestination,
    languages: options.languages,
  });
  await app.init();
  await listenOnLoopback(app);

  const prisma = app.get(PrismaService, { strict: false });
  // "tenants" arrastra en cascada a lenders/portfolios/clients/loans/memberships/collection_*/
  // payments (todos cuelgan de él, directa o indirectamente); "verifications" no tiene FK a
  // "users" (guarda el identificador como texto, D-68), así que hay que nombrarla aparte.
  await prisma.$executeRaw`TRUNCATE TABLE "users", "verifications", "tenants" CASCADE`;

  const createUseCase = app.get(CreateUserUseCase, { strict: false });
  return {
    app,
    http: request(app.getHttpServer()),
    prisma,
    createUser: (input) => createUseCase.execute(input),
    emails,
    pushes,
    close: () => app.close(),
  };
}
