import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { z } from 'zod';
import type { Env } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';
import { ResolveSignInPhoneUseCase } from '@/modules/auth/application/use-cases/resolve-sign-in-phone.use-case.js';
import { toAuthRequest } from '@/modules/auth/infrastructure/better-auth/auth-request.js';
import { writeAuthResponse } from '@/modules/auth/infrastructure/better-auth/auth-response.js';
import {
  AUTH_BASE_PATH,
  SIGN_IN_PATH,
} from '@/modules/auth/infrastructure/better-auth/auth.constants.js';
import type { Auth } from '@/modules/auth/infrastructure/better-auth/auth.factory.js';
import { BETTER_AUTH } from '@/modules/auth/infrastructure/better-auth/auth.token.js';
import { ApiSignInWithIdentifier } from '@/modules/auth/infrastructure/controllers/docs/auth-routes.docs.js';
import { SignInWithIdentifierRequestSchema } from '@/modules/auth/infrastructure/controllers/schemas/auth-requests.schema.js';
import { ApiErrorFactory } from '@/shared/infrastructure/filters/api-error.factory.js';
import { Public } from '@/shared/infrastructure/http/public.decorator.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/**
 * `POST /auth/sign-in`: iniciar sesión con celular o con correo verificado.
 *
 * @remarks
 * Resuelve la identidad a un celular y reenvía a la ruta de celular de better-auth, así el bloqueo
 * por intentos, la nivelación de tiempo, la auditoría y los errores son los mismos que los de
 * `POST /auth/sign-in/phone-number`. Vive aparte de `AuthController` por tamaño.
 */
@ApiTags(API_TAGS.auth.name)
@Public()
@Controller({ path: AUTH_BASE_PATH.slice(1), version: VERSION_NEUTRAL })
export class SignInController {
  constructor(
    @Inject(BETTER_AUTH) private readonly auth: Auth,
    @Inject(ENV) private readonly env: Env,
    private readonly errors: ApiErrorFactory,
    private readonly resolveSignInPhone: ResolveSignInPhoneUseCase,
  ) {}

  /**
   * @param body - Identidad (celular o correo) y contraseña, ya validadas.
   * @param req - Petición de Express.
   * @param res - Respuesta de Express; la escribe better-auth.
   */
  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  @ApiSignInWithIdentifier()
  async signIn(
    @Body({ schema: SignInWithIdentifierRequestSchema })
    body: z.output<typeof SignInWithIdentifierRequestSchema>,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const request = toAuthRequest(req, {
      baseUrl: this.env.auth.baseUrl,
      pathname: `${AUTH_BASE_PATH}${SIGN_IN_PATH}`,
      body: {
        phoneNumber: await this.resolveSignInPhone.execute(body.identifier),
        password: body.password,
        rememberMe: body.rememberMe,
      },
    });
    await writeAuthResponse(res, await this.auth.handler(request), this.errors);
  }
}
