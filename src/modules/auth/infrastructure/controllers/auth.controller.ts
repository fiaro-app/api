import {
  Body,
  Controller,
  Get,
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
import { RequestPasswordResetUseCase } from '@/modules/auth/application/use-cases/request-password-reset.use-case.js';
import { ResetPasswordUseCase } from '@/modules/auth/application/use-cases/reset-password.use-case.js';
import { toAuthRequest } from '@/modules/auth/infrastructure/better-auth/auth-request.js';
import type { RequestOrigin } from '@/modules/auth/infrastructure/better-auth/auth-auditor.js';
import { AuthAuditor } from '@/modules/auth/infrastructure/better-auth/auth-auditor.js';
import { writeAuthResponse } from '@/modules/auth/infrastructure/better-auth/auth-response.js';
import {
  AUTH_BASE_PATH,
  CHANGE_PASSWORD_PATH,
  GET_SESSION_PATH,
  REVOKE_OTHER_SESSIONS_PATH,
  REVOKE_SESSIONS_PATH,
  SIGN_IN_PATH,
  SIGN_OUT_PATH,
} from '@/modules/auth/infrastructure/better-auth/auth.constants.js';
import type { Auth } from '@/modules/auth/infrastructure/better-auth/auth.factory.js';
import { BETTER_AUTH } from '@/modules/auth/infrastructure/better-auth/auth.token.js';
import {
  ApiChangePassword,
  ApiGetSession,
  ApiRequestPasswordReset,
  ApiResetPassword,
  ApiRevokeOtherSessions,
  ApiRevokeSessions,
  ApiSignIn,
  ApiSignOut,
} from '@/modules/auth/infrastructure/controllers/docs/auth-routes.docs.js';
import {
  ChangePasswordRequestSchema,
  RequestPasswordResetRequestSchema,
  ResetPasswordRequestSchema,
  SignInRequestSchema,
} from '@/modules/auth/infrastructure/controllers/schemas/auth-requests.schema.js';
import type { StatusResponseSchema } from '@/modules/auth/infrastructure/controllers/schemas/auth-responses.schema.js';
import { PasswordResetGuard } from '@/modules/auth/infrastructure/password-reset/password-reset-guard.js';
import { ApiErrorFactory } from '@/shared/infrastructure/filters/api-error.factory.js';
import { Public } from '@/shared/infrastructure/http/public.decorator.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/**
 * Publica las rutas de autenticación y las pasa a better-auth, que responde con la cookie de
 * sesión incluida. Solo existen las rutas declaradas aquí: registro, correo, cuentas sociales y
 * el resto de lo que trae la librería no se publica.
 *
 * @remarks
 * Nest valida el cuerpo con los schemas de `schemas/` antes de llegar aquí y aplica su rate limit
 * general; better-auth cuenta después el suyo por ruta (iniciar sesión y cambiar la contraseña,
 * 5 por minuto y por IP). La documentación de cada ruta vive en `docs/`.
 */
@ApiTags(API_TAGS.auth.name)
@Public()
@Controller({ path: AUTH_BASE_PATH.slice(1), version: VERSION_NEUTRAL })
export class AuthController {
  constructor(
    @Inject(BETTER_AUTH) private readonly auth: Auth,
    @Inject(ENV) private readonly env: Env,
    private readonly errors: ApiErrorFactory,
    private readonly auditor: AuthAuditor,
    private readonly passwordResetGuard: PasswordResetGuard,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
  ) {}

  /**
   * Inicia sesión con celular y contraseña y responde con la cookie de sesión.
   *
   * @param body - Celular y contraseña, ya validados.
   * @param req - Petición de Express.
   * @param res - Respuesta de Express; la escribe better-auth.
   */
  @Post('sign-in/phone-number')
  @HttpCode(HttpStatus.OK)
  @ApiSignIn()
  async signIn(
    @Body({ schema: SignInRequestSchema })
    body: z.output<typeof SignInRequestSchema>,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.forward(req, res, SIGN_IN_PATH, body);
  }

  /**
   * Devuelve la sesión y la persona de la cookie, y la renueva si ya toca.
   *
   * @param req - Petición de Express, con la cookie de sesión.
   * @param res - Respuesta de Express; la escribe better-auth.
   */
  @Get('get-session')
  @ApiGetSession()
  async getSession(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.forward(req, res, GET_SESSION_PATH);
  }

  /**
   * Cierra la sesión de la cookie y la revoca en el servidor.
   *
   * @param req - Petición de Express, con la cookie de sesión.
   * @param res - Respuesta de Express; la escribe better-auth.
   */
  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  @ApiSignOut()
  async signOut(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.forward(req, res, SIGN_OUT_PATH);
  }

  /**
   * Pide recuperar la contraseña de un celular por correo: si tiene cuenta y correo de contacto,
   * manda un código. Responde lo mismo siempre, para no revelar qué celulares tienen cuenta.
   *
   * @param body - Celular, ya validado.
   * @param req - Petición de Express.
   */
  @Post('request-password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiRequestPasswordReset()
  async requestPasswordReset(
    @Body({ schema: RequestPasswordResetRequestSchema })
    body: z.output<typeof RequestPasswordResetRequestSchema>,
    @Req() req: Request,
  ): Promise<z.output<typeof StatusResponseSchema>> {
    const allowed = await this.passwordResetGuard.admitRequest(
      body.phoneNumber,
    );
    const sent = allowed
      ? await this.requestPasswordResetUseCase.execute(body)
      : false;
    this.auditor.passwordResetRequested(
      body.phoneNumber,
      sent,
      this.originOf(req),
    );
    return { status: true };
  }

  /**
   * Canjea el código de recuperación por una contraseña nueva y cierra todas las sesiones de la
   * persona.
   *
   * @param body - Celular, código y contraseña nueva, ya validados.
   * @param req - Petición de Express.
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiResetPassword()
  async resetPassword(
    @Body({ schema: ResetPasswordRequestSchema })
    body: z.output<typeof ResetPasswordRequestSchema>,
    @Req() req: Request,
  ): Promise<z.output<typeof StatusResponseSchema>> {
    await this.passwordResetGuard.admitVerification(body.phoneNumber);
    const { userId } = await this.resetPasswordUseCase.execute(body);
    await this.passwordResetGuard.forgiveVerification(body.phoneNumber);
    this.auditor.passwordResetCompleted(
      { id: userId, phone: body.phoneNumber },
      this.originOf(req),
    );
    return { status: true };
  }

  /**
   * Cambia la contraseña, revoca las demás sesiones y quita la marca de contraseña temporal.
   *
   * @param body - Contraseña actual y nueva, ya validadas.
   * @param req - Petición de Express, con la cookie de sesión.
   * @param res - Respuesta de Express; la escribe better-auth.
   */
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiChangePassword()
  async changePassword(
    @Body({ schema: ChangePasswordRequestSchema })
    body: z.output<typeof ChangePasswordRequestSchema>,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.forward(req, res, CHANGE_PASSWORD_PATH, body);
  }

  /**
   * Cierra en el servidor todas las sesiones de la persona salvo la de la cookie.
   *
   * @param req - Petición de Express, con la cookie de sesión.
   * @param res - Respuesta de Express; la escribe better-auth.
   */
  @Post('revoke-other-sessions')
  @HttpCode(HttpStatus.OK)
  @ApiRevokeOtherSessions()
  async revokeOtherSessions(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.forward(req, res, REVOKE_OTHER_SESSIONS_PATH);
  }

  /**
   * Cierra en el servidor todas las sesiones de la persona, la de la cookie incluida.
   *
   * @param req - Petición de Express, con la cookie de sesión.
   * @param res - Respuesta de Express; la escribe better-auth.
   */
  @Post('revoke-sessions')
  @HttpCode(HttpStatus.OK)
  @ApiRevokeSessions()
  async revokeSessions(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.forward(req, res, REVOKE_SESSIONS_PATH);
  }

  private async forward(
    req: Request,
    res: Response,
    path: string,
    body?: unknown,
  ): Promise<void> {
    const request = toAuthRequest(req, {
      baseUrl: this.env.auth.baseUrl,
      pathname: `${AUTH_BASE_PATH}${path}`,
      body,
    });
    await writeAuthResponse(res, await this.auth.handler(request), this.errors);
  }

  /** @param req - Petición de Express: no pasa por better-auth, así que la IP y el navegador se leen directo. */
  private originOf(req: Request): RequestOrigin {
    return { ip: req.ip, userAgent: req.headers['user-agent'] };
  }
}
