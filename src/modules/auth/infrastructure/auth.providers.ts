import type { Provider } from '@nestjs/common';
import type { Env } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';
import { SESSION_RESOLVER } from '@/shared/application/ports/session-resolver.token.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';
import { PASSWORD_HASHER } from '@/modules/auth/application/ports/password-hasher.token.js';
import { CreateUserUseCase } from '@/modules/auth/application/use-cases/create-user.use-case.js';
import { USER_REPOSITORY } from '@/modules/auth/domain/tokens/user-repository.token.js';
import { createAuth } from '@/modules/auth/infrastructure/better-auth/auth.factory.js';
import { BETTER_AUTH } from '@/modules/auth/infrastructure/better-auth/auth.token.js';
import { BetterAuthPasswordHasher } from '@/modules/auth/infrastructure/better-auth/better-auth-password-hasher.js';
import { BetterAuthSessionResolver } from '@/modules/auth/infrastructure/better-auth/better-auth-session-resolver.js';
import { PrismaUserRepository } from '@/modules/auth/infrastructure/persistence/prisma-user.repository.js';

/**
 * Qué implementa cada puerto del módulo. Vive en `infrastructure` y no en `auth.module.ts`
 * porque los `*.module.ts` no pueden importar los tokens de `shared/application`.
 */
export const authProviders: Provider[] = [
  {
    provide: BETTER_AUTH,
    inject: [ENV, PrismaService, ID_GENERATOR],
    useFactory: (env: Env, prisma: PrismaService, ids: IdGenerator) =>
      createAuth({ env, prisma, ids }),
  },
  { provide: SESSION_RESOLVER, useClass: BetterAuthSessionResolver },
  { provide: PASSWORD_HASHER, useClass: BetterAuthPasswordHasher },
  { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  CreateUserUseCase,
];

/** Lo que el módulo ofrece a los demás: el resolvedor de sesión del guard global y el alta de personas. */
export const authExports = [SESSION_RESOLVER, CreateUserUseCase];
