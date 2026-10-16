import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TURNSTILE_HEADER } from '@fiaro-app/contracts';
import type { Request } from 'express';
import type { z } from 'zod';
import { RegisterOwnerUseCase } from '@/modules/tenants/application/use-cases/register-owner.use-case.js';
import { ApiRegisterOwner } from '@/modules/tenants/infrastructure/controllers/docs/registration-routes.docs.js';
import { RegisterOwnerRequestSchema } from '@/modules/tenants/infrastructure/controllers/schemas/registration-requests.schema.js';
import {
  toRegisterOwnerResponse,
  type RegisterOwnerResponseSchema,
} from '@/modules/tenants/infrastructure/controllers/schemas/registration-responses.schema.js';
import { Public } from '@/shared/infrastructure/http/public.decorator.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';
import { TurnstileVerificationError } from '@/shared/domain/errors/turnstile-verification.error.js';
import { TurnstileService } from '@/shared/infrastructure/turnstile/turnstile.service.js';

/**
 * Registro público de un negocio nuevo. Primera ruta pública fuera de `AuthController`
 * (`@Public()`, sin sesión): el único camino, hasta ahora, era el seed de desarrollo
 * (`CreateTenantUseCase`, D-72/D-73).
 *
 * @remarks
 * No inicia sesión: crear la cuenta y abrir sesión son dos pasos separados, como en
 * cualquier flujo de registro seguido de inicio de sesión; abrir la sesión aquí habría exigido
 * invocar el mecanismo interno de better-auth por fuera de su propio `auth.handler`, sin
 * necesidad real para el MVP.
 */
@ApiTags(API_TAGS.registration.name)
@Public()
@Controller('register')
export class RegistrationController {
  constructor(
    private readonly registerOwnerUseCase: RegisterOwnerUseCase,
    private readonly turnstile: TurnstileService,
  ) {}

  /** @param body - Los datos de la persona y el nombre del negocio, ya validados. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiRegisterOwner()
  async register(
    @Body({ schema: RegisterOwnerRequestSchema })
    body: z.output<typeof RegisterOwnerRequestSchema>,
    @Headers(TURNSTILE_HEADER) headerToken: string | undefined,
    @Req() request: Request,
  ): Promise<z.output<typeof RegisterOwnerResponseSchema>> {
    if (
      !(await this.turnstile.validateToken(
        body.turnstileToken ?? headerToken,
        request.ip,
        'register',
      ))
    ) {
      throw new TurnstileVerificationError();
    }
    return toRegisterOwnerResponse(
      await this.registerOwnerUseCase.execute({
        phone: body.phone,
        fullName: body.fullName,
        password: body.password,
        nationalId: body.nationalId,
        contactEmail: body.contactEmail,
        businessName: body.businessName,
        legal: {
          version: body.legalVersion,
          marketing: body.marketingConsent,
          ipAddress: request.ip ?? null,
          userAgent: request.headers['user-agent'] ?? null,
        },
      }),
    );
  }
}
