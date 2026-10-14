import type { Provider } from '@nestjs/common';
import type { Env } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { AUDIT_LOG } from '@/shared/application/audit/audit-log.token.js';
import type { AuditLog } from '@/shared/application/audit/audit-log.port.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';
import { SESSION_RESOLVER } from '@/shared/application/ports/session-resolver.token.js';
import { TEMP_PASSWORD_GENERATOR } from '@/shared/application/ports/temp-password-generator.token.js';
import { RandomTempPasswordGenerator } from '@/shared/infrastructure/crypto/random-temp-password-generator.js';
import { PersonalDataMasker } from '@/shared/infrastructure/audit/personal-data-masker.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';
import { CONTACT_EMAIL_VERIFICATION_VERIFY_ATTEMPTS } from '@/modules/auth/application/ports/contact-email-verification-verify-attempts.token.js';
import { NOTIFICATION_RECIPIENT_READER } from '@/modules/auth/application/ports/notification-recipient-reader.token.js';
import { PASSWORD_HASHER } from '@/modules/auth/application/ports/password-hasher.token.js';
import { PASSWORD_RESET_REQUEST_ATTEMPTS } from '@/modules/auth/application/ports/password-reset-request-attempts.token.js';
import { PASSWORD_RESET_VERIFY_ATTEMPTS } from '@/modules/auth/application/ports/password-reset-verify-attempts.token.js';
import type { SignInAttempts } from '@/modules/auth/application/ports/sign-in-attempts.port.js';
import { SIGN_IN_ATTEMPTS } from '@/modules/auth/application/ports/sign-in-attempts.token.js';
import { VERIFICATION_CODE_GENERATOR } from '@/modules/auth/application/ports/verification-code-generator.token.js';
import { VERIFICATION_CODE_HASHER } from '@/modules/auth/application/ports/verification-code-hasher.token.js';
import { ListAccountSessionsUseCase } from '@/modules/auth/application/use-cases/list-account-sessions.use-case.js';
import { RevokeAccountSessionUseCase } from '@/modules/auth/application/use-cases/revoke-account-session.use-case.js';
import { DeactivateAccountUseCase } from '@/modules/auth/application/use-cases/deactivate-account.use-case.js';
import { RequestContactEmailVerificationUseCase } from '@/modules/auth/application/use-cases/request-contact-email-verification.use-case.js';
import { RequestPasswordResetUseCase } from '@/modules/auth/application/use-cases/request-password-reset.use-case.js';
import { ResetPasswordUseCase } from '@/modules/auth/application/use-cases/reset-password.use-case.js';
import { UpdateProfileUseCase } from '@/modules/auth/application/use-cases/update-profile.use-case.js';
import { VerifyContactEmailUseCase } from '@/modules/auth/application/use-cases/verify-contact-email.use-case.js';
import { CreateUserUseCase } from '@/modules/auth/application/use-cases/create-user.use-case.js';
import { AdminResetPasswordUseCase } from '@/modules/auth/application/use-cases/admin-reset-password.use-case.js';
import { GetUserByIdUseCase } from '@/modules/auth/application/use-cases/get-user-by-id.use-case.js';
import { GetUserByPhoneUseCase } from '@/modules/auth/application/use-cases/get-user-by-phone.use-case.js';
import { SESSION_REPOSITORY } from '@/modules/auth/domain/tokens/session-repository.token.js';
import { USER_REPOSITORY } from '@/modules/auth/domain/tokens/user-repository.token.js';
import { VERIFICATION_CODE_REPOSITORY } from '@/modules/auth/domain/tokens/verification-code-repository.token.js';
import { AuthAuditor } from '@/modules/auth/infrastructure/better-auth/auth-auditor.js';
import { createAuth } from '@/modules/auth/infrastructure/better-auth/auth.factory.js';
import { BETTER_AUTH } from '@/modules/auth/infrastructure/better-auth/auth.token.js';
import { BetterAuthPasswordHasher } from '@/modules/auth/infrastructure/better-auth/better-auth-password-hasher.js';
import { BetterAuthSessionResolver } from '@/modules/auth/infrastructure/better-auth/better-auth-session-resolver.js';
import { SignInGuard } from '@/modules/auth/infrastructure/better-auth/sign-in-guard.js';
import { RandomVerificationCodeGenerator } from '@/modules/auth/infrastructure/crypto/random-verification-code-generator.js';
import { Sha256VerificationCodeHasher } from '@/modules/auth/infrastructure/crypto/sha256-verification-code-hasher.js';
import { createAttemptCounter } from '@/modules/auth/infrastructure/lockout/attempt-counter.factory.js';
import { createSignInAttempts } from '@/modules/auth/infrastructure/lockout/sign-in-attempts.factory.js';
import {
  PASSWORD_RESET_REQUEST_MAX_ATTEMPTS,
  PASSWORD_RESET_REQUEST_WINDOW_SECONDS,
  PASSWORD_RESET_VERIFY_MAX_ATTEMPTS,
  PASSWORD_RESET_VERIFY_WINDOW_SECONDS,
} from '@/modules/auth/domain/policies/password-reset.policy.js';
import {
  CONTACT_EMAIL_VERIFICATION_VERIFY_MAX_ATTEMPTS,
  CONTACT_EMAIL_VERIFICATION_VERIFY_WINDOW_SECONDS,
} from '@/modules/auth/domain/policies/contact-email-verification.policy.js';
import { ContactEmailVerificationGuard } from '@/modules/auth/infrastructure/contact-email-verification/contact-email-verification-guard.js';
import { PasswordResetGuard } from '@/modules/auth/infrastructure/password-reset/password-reset-guard.js';
import { PrismaNotificationRecipientReader } from '@/modules/auth/infrastructure/persistence/prisma-notification-recipient.reader.js';
import { PrismaSessionRepository } from '@/modules/auth/infrastructure/persistence/prisma-session.repository.js';
import { PrismaUserRepository } from '@/modules/auth/infrastructure/persistence/prisma-user.repository.js';
import { PrismaVerificationCodeRepository } from '@/modules/auth/infrastructure/persistence/prisma-verification-code.repository.js';

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
    provide: PASSWORD_RESET_REQUEST_ATTEMPTS,
    inject: [ENV],
    useFactory: (env: Env): SignInAttempts =>
      createAttemptCounter(
        env,
        'password-reset-requests',
        PASSWORD_RESET_REQUEST_MAX_ATTEMPTS,
        PASSWORD_RESET_REQUEST_WINDOW_SECONDS,
        'PasswordResetRequestAttempts',
      ),
  },
  {
    provide: PASSWORD_RESET_VERIFY_ATTEMPTS,
    inject: [ENV],
    useFactory: (env: Env): SignInAttempts =>
      createAttemptCounter(
        env,
        'password-reset-verify',
        PASSWORD_RESET_VERIFY_MAX_ATTEMPTS,
        PASSWORD_RESET_VERIFY_WINDOW_SECONDS,
        'PasswordResetVerifyAttempts',
      ),
  },
  {
    provide: CONTACT_EMAIL_VERIFICATION_VERIFY_ATTEMPTS,
    inject: [ENV],
    useFactory: (env: Env): SignInAttempts =>
      createAttemptCounter(
        env,
        'contact-email-verification-verify',
        CONTACT_EMAIL_VERIFICATION_VERIFY_MAX_ATTEMPTS,
        CONTACT_EMAIL_VERIFICATION_VERIFY_WINDOW_SECONDS,
        'ContactEmailVerificationVerifyAttempts',
      ),
  },
  {
    provide: AuthAuditor,
    inject: [AUDIT_LOG, PersonalDataMasker],
    useFactory: (audit: AuditLog, masker: PersonalDataMasker) =>
      new AuthAuditor(audit, masker),
  },
  {
    provide: PasswordResetGuard,
    inject: [
      PASSWORD_RESET_REQUEST_ATTEMPTS,
      PASSWORD_RESET_VERIFY_ATTEMPTS,
      PersonalDataMasker,
    ],
    useFactory: (
      requestAttempts: SignInAttempts,
      verifyAttempts: SignInAttempts,
      masker: PersonalDataMasker,
    ) => new PasswordResetGuard(requestAttempts, verifyAttempts, masker),
  },
  {
    provide: ContactEmailVerificationGuard,
    inject: [CONTACT_EMAIL_VERIFICATION_VERIFY_ATTEMPTS],
    useFactory: (verifyAttempts: SignInAttempts) =>
      new ContactEmailVerificationGuard(verifyAttempts),
  },
  {
    provide: BETTER_AUTH,
    inject: [
      ENV,
      PrismaService,
      ID_GENERATOR,
      AuthAuditor,
      PersonalDataMasker,
      SIGN_IN_ATTEMPTS,
    ],
    useFactory: (
      env: Env,
      prisma: PrismaService,
      ids: IdGenerator,
      auditor: AuthAuditor,
      masker: PersonalDataMasker,
      attempts: SignInAttempts,
    ) => {
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
  { provide: TEMP_PASSWORD_GENERATOR, useClass: RandomTempPasswordGenerator },
  { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  { provide: SESSION_REPOSITORY, useClass: PrismaSessionRepository },
  {
    provide: VERIFICATION_CODE_REPOSITORY,
    useClass: PrismaVerificationCodeRepository,
  },
  {
    provide: VERIFICATION_CODE_GENERATOR,
    useClass: RandomVerificationCodeGenerator,
  },
  { provide: VERIFICATION_CODE_HASHER, useClass: Sha256VerificationCodeHasher },
  {
    provide: NOTIFICATION_RECIPIENT_READER,
    useClass: PrismaNotificationRecipientReader,
  },
  CreateUserUseCase,
  GetUserByPhoneUseCase,
  GetUserByIdUseCase,
  AdminResetPasswordUseCase,
  RequestPasswordResetUseCase,
  ResetPasswordUseCase,
  RequestContactEmailVerificationUseCase,
  VerifyContactEmailUseCase,
  UpdateProfileUseCase,
  DeactivateAccountUseCase,
  ListAccountSessionsUseCase,
  RevokeAccountSessionUseCase,
];

/**
 * Lo que el módulo ofrece a los demás: el resolvedor de sesión del guard global, el alta de
 * personas, la búsqueda por celular (la usa `memberships` para invitar a un cobrador), por id (la
 * usa `memberships` para mostrar nombre y celular al listar colaboradores, D-92), el reinicio de
 * contraseña a una temporal (la usa `memberships` para que un `OWNER`/`LENDER` reinicie la de un
 * colaborador, D-93) y a qué correo se le puede mandar una notificación (la usa `notifications`,
 * D-94).
 */
export const authExports = [
  SESSION_RESOLVER,
  CreateUserUseCase,
  GetUserByPhoneUseCase,
  GetUserByIdUseCase,
  AdminResetPasswordUseCase,
  NOTIFICATION_RECIPIENT_READER,
];
