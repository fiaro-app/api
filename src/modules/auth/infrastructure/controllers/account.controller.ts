import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { z } from 'zod';
import { DeactivateAccountUseCase } from '@/modules/auth/application/use-cases/deactivate-account.use-case.js';
import { RequestContactEmailVerificationUseCase } from '@/modules/auth/application/use-cases/request-contact-email-verification.use-case.js';
import { UpdateProfileUseCase } from '@/modules/auth/application/use-cases/update-profile.use-case.js';
import { VerifyContactEmailUseCase } from '@/modules/auth/application/use-cases/verify-contact-email.use-case.js';
import type { RequestOrigin } from '@/modules/auth/infrastructure/better-auth/auth-auditor.js';
import { AuthAuditor } from '@/modules/auth/infrastructure/better-auth/auth-auditor.js';
import {
  ApiDeactivateAccount,
  ApiRequestContactEmailVerification,
  ApiUpdateProfile,
  ApiVerifyContactEmail,
} from '@/modules/auth/infrastructure/controllers/docs/account-routes.docs.js';
import {
  DeactivateAccountRequestSchema,
  UpdateProfileRequestSchema,
  VerifyContactEmailRequestSchema,
} from '@/modules/auth/infrastructure/controllers/schemas/account-requests.schema.js';
import type { UpdateProfileResponseSchema } from '@/modules/auth/infrastructure/controllers/schemas/account-responses.schema.js';
import type { StatusResponseSchema } from '@/modules/auth/infrastructure/controllers/schemas/auth-responses.schema.js';
import { ContactEmailVerificationGuard } from '@/modules/auth/infrastructure/contact-email-verification/contact-email-verification-guard.js';
import { CurrentUser } from '@/shared/infrastructure/http/current-user.decorator.js';
import type { AuthenticatedUser } from '@/shared/application/ports/session-resolver.port.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/**
 * Gestión de la propia cuenta con sesión abierta. A diferencia de `AuthController`, no es
 * `@Public()`: el guard global exige sesión, y `@CurrentUser()` entrega quién la tiene.
 */
@ApiTags(API_TAGS.account.name)
@Controller('account')
export class AccountController {
  constructor(
    private readonly auditor: AuthAuditor,
    private readonly contactEmailVerificationGuard: ContactEmailVerificationGuard,
    private readonly requestContactEmailVerificationUseCase: RequestContactEmailVerificationUseCase,
    private readonly verifyContactEmailUseCase: VerifyContactEmailUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly deactivateAccountUseCase: DeactivateAccountUseCase,
  ) {}

  /**
   * Manda un código para verificar el correo de contacto de la persona autenticada.
   *
   * @param user - La persona autenticada.
   * @param req - Petición de Express.
   */
  @Post('contact-email/request-verification')
  @HttpCode(HttpStatus.OK)
  @ApiRequestContactEmailVerification()
  async requestContactEmailVerification(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<z.output<typeof StatusResponseSchema>> {
    await this.requestContactEmailVerificationUseCase.execute({
      userId: user.id,
    });
    this.auditor.contactEmailVerificationRequested(user.id, this.originOf(req));
    return { status: true };
  }

  /**
   * Canjea el código y verifica el correo de contacto de la persona autenticada.
   *
   * @param body - El código, ya validado.
   * @param user - La persona autenticada.
   * @param req - Petición de Express.
   */
  @Post('contact-email/verify')
  @HttpCode(HttpStatus.OK)
  @ApiVerifyContactEmail()
  async verifyContactEmail(
    @Body({ schema: VerifyContactEmailRequestSchema })
    body: z.output<typeof VerifyContactEmailRequestSchema>,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<z.output<typeof StatusResponseSchema>> {
    await this.contactEmailVerificationGuard.admitVerification(user.id);
    await this.verifyContactEmailUseCase.execute({
      userId: user.id,
      code: body.code,
    });
    await this.contactEmailVerificationGuard.forgiveVerification(user.id);
    this.auditor.contactEmailVerified(user.id, this.originOf(req));
    return { status: true };
  }

  /**
   * Actualiza el nombre o el correo de contacto de la persona autenticada.
   *
   * @param body - Los campos que cambian, ya validados.
   * @param user - La persona autenticada.
   * @param req - Petición de Express.
   */
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiUpdateProfile()
  async updateProfile(
    @Body({ schema: UpdateProfileRequestSchema })
    body: z.output<typeof UpdateProfileRequestSchema>,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<z.output<typeof UpdateProfileResponseSchema>> {
    const profile = await this.updateProfileUseCase.execute({
      userId: user.id,
      ...body,
    });
    this.auditor.profileUpdated(
      user.id,
      {
        fullName: body.fullName !== undefined,
        contactEmail: body.contactEmail !== undefined,
      },
      this.originOf(req),
    );
    return profile;
  }

  /**
   * Desactiva la cuenta de la persona autenticada y cierra todas sus sesiones.
   *
   * @param body - La contraseña actual, como confirmación.
   * @param user - La persona autenticada.
   * @param req - Petición de Express.
   */
  @Post('deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiDeactivateAccount()
  async deactivateAccount(
    @Body({ schema: DeactivateAccountRequestSchema })
    body: z.output<typeof DeactivateAccountRequestSchema>,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<z.output<typeof StatusResponseSchema>> {
    await this.deactivateAccountUseCase.execute({
      userId: user.id,
      password: body.password,
    });
    this.auditor.accountDeactivated(user.id, this.originOf(req));
    return { status: true };
  }

  /** @param req - Petición de Express. */
  private originOf(req: Request): RequestOrigin {
    return { ip: req.ip, userAgent: req.headers['user-agent'] };
  }
}
