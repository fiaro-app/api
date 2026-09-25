import type { Provider } from '@nestjs/common';
import type { Env } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { AUDIT_LOG } from '@/shared/application/audit/audit-log.token.js';
import type { AuditLog } from '@/shared/application/audit/audit-log.port.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';
import { SESSION_RESOLVER } from '@/shared/application/ports/session-resolver.token.js';
import { PersonalDataMasker } from '@/shared/infrastructure/audit/personal-data-masker.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';
import { PASSWORD_HASHER } from '@/modules/auth/application/ports/password-hasher.token.js';
import type { SignInAttempts } from '@/modules/auth/application/ports/sign-in-attempts.port.js';
import { SIGN_IN_ATTEMPTS } from '@/modules/auth/application/ports/sign-in-attempts.token.js';
import { CreateUserUseCase } from '@/modules/auth/application/use-cases/create-user.use-case.js';
import { USER_REPOSITORY } from '@/modules/auth/domain/tokens/user-repository.token.js';
import { AuthAuditor } from '@/modules/auth/infrastructure/better-auth/auth-auditor.js';
import { createAuth } from '@/modules/auth/infrastructure/better-auth/auth.factory.js';
import { BETTER_AUTH } from '@/modules/auth/infrastructure/better-auth/auth.token.js';
import { BetterAuthPasswordHasher } from '@/modules/auth/infrastructure/better-auth/better-auth-password-hasher.js';
import { BetterAuthSessionResolver } from '@/modules/auth/infrastructure/better-auth/better-auth-session-resolver.js';
import { SignInGuard } from '@/modules/auth/infrastructure/better-auth/sign-in-guard.js';
import { createSignInAttempts } from '@/modules/auth/infrastructure/lockout/sign-in-attempts.factory.js';
import { PrismaUserRepository } from '@/modules/auth/infrastructure/persistence/prisma-user.repository.js';

/**
 * Qué implementa cada puerto del módulo. Vive en `infrastructure` y no en `auth.module.ts`
 * porque los `*.module.ts` no pueden importar los tokens de `shared/application`.
 */
export const authProviders: Provider[] = [
  {
    provide: SIGN_IN_ATTEMPTS,
    inject: [ENV],
    useFactory: (env: Env): SignInAttempts => createSignInAttempts(env),
  },
  {
    provide: BETTER_AUTH,
    inject: [
      ENV,
      PrismaService,
      ID_GENERATOR,
      AUDIT_LOG,
      PersonalDataMasker,
      SIGN_IN_ATTEMPTS,
    ],
    useFactory: (
      env: Env,
      prisma: PrismaService,
      ids: IdGenerator,
      audit: AuditLog,
      masker: PersonalDataMasker,
      attempts: SignInAttempts,
    ) => {
      const auditor = new AuthAuditor(audit, masker);
      return createAuth({
        env,
        prisma,
        ids,
        auditor,
        guard: new SignInGuard(attempts, masker, auditor),
      });
    },
  },
  { provide: SESSION_RESOLVER, useClass: BetterAuthSessionResolver },
  { provide: PASSWORD_HASHER, useClass: BetterAuthPasswordHasher },
  { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  CreateUserUseCase,
];

/** Lo que el módulo ofrece a los demás: el resolvedor de sesión del guard global y el alta de personas. */
export const authExports = [SESSION_RESOLVER, CreateUserUseCase];
