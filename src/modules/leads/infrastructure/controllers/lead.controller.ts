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
import { Throttle } from '@nestjs/throttler';
import { TURNSTILE_HEADER } from '@fiaro-app/contracts';
import type { Request } from 'express';
import type { z } from 'zod';
import { CreateLeadUseCase } from '@/modules/leads/application/use-cases/create-lead.use-case.js';
import { ApiCreateLead } from '@/modules/leads/infrastructure/controllers/docs/lead-routes.docs.js';
import { CreateLeadRequestSchema } from '@/modules/leads/infrastructure/controllers/schemas/lead-requests.schema.js';
import type { LeadReceivedResponseSchema } from '@/modules/leads/infrastructure/controllers/schemas/lead-responses.schema.js';
import { Public } from '@/shared/infrastructure/http/public.decorator.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';
import { TurnstileVerificationError } from '@/shared/domain/errors/turnstile-verification.error.js';
import { TurnstileService } from '@/shared/infrastructure/turnstile/turnstile.service.js';

/** Cuántos contactos admite una misma IP por ventana. */
export const LEAD_RATE_LIMIT = 5;

/** Ventana del límite: una hora, en milisegundos. */
export const LEAD_RATE_WINDOW_MS = 60 * 60 * 1000;

/**
 * El formulario «Contactar ventas» del sitio de marketing. Pública (`@Public()`, sin sesión) y,
 * por serlo, con un límite propio mucho más estricto que el general: cualquiera en internet puede
 * llamarla, y cada llamada guarda una fila y manda un correo.
 *
 * @remarks
 * Dos defensas más contra el spam, además del límite por IP: el campo señuelo `website`
 * (ver {@link CreateLeadRequestSchema}) y que el aviso a ventas escape todo el texto libre.
 * Ninguna ruta devuelve los contactos guardados: solo ventas los lee, por correo o desde la base.
 */
@ApiTags(API_TAGS.lead.name)
@Public()
@Controller('leads')
export class LeadController {
  constructor(
    private readonly createLeadUseCase: CreateLeadUseCase,
    private readonly turnstile: TurnstileService,
  ) {}

  /** @param body - Los datos del contacto, ya validados. */
  @Post()
  @Throttle({ default: { limit: LEAD_RATE_LIMIT, ttl: LEAD_RATE_WINDOW_MS } })
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateLead()
  async createLead(
    @Body({ schema: CreateLeadRequestSchema })
    body: z.output<typeof CreateLeadRequestSchema>,
    @Headers(TURNSTILE_HEADER) headerToken: string | undefined,
    @Req() request: Request,
  ): Promise<z.output<typeof LeadReceivedResponseSchema>> {
    if (body.website !== undefined && body.website.trim() !== '') {
      return { received: true };
    }
    if (
      !(await this.turnstile.validateToken(
        body.turnstileToken ?? headerToken,
        request.ip,
        'lead',
      ))
    ) {
      throw new TurnstileVerificationError();
    }
    await this.createLeadUseCase.execute({
      name: body.name,
      phone: body.phone,
      email: body.email,
      message: body.message,
    });
    return { received: true };
  }
}
