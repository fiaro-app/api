import {
  Body,
  Controller,
  Get,
  Post,
  QueryMethod,
  Req,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { Public } from '@/shared/infrastructure/http/public.decorator.js';

const NoteSchema = z.strictObject({
  name: z.string().min(1),
  amount: z.int().min(1).default(1),
});
const SearchSchema = z.strictObject({ text: z.string().default('') });

/** Rutas de la versión 1: no declaran versión y heredan la de por defecto. */
@Public()
@Controller('probe')
export class ProbeController {
  @Get('ping')
  ping() {
    return { version: 1 };
  }

  /** Existe solo en la versión 1. */
  @Get('other')
  other() {
    return { other: true };
  }

  @Get('cookies')
  cookies(@Req() req: Request) {
    return req.cookies as Record<string, string>;
  }

  @Post('echo')
  echo(@Body({ schema: NoteSchema }) body: z.output<typeof NoteSchema>) {
    return body;
  }

  @Post('unvalidated')
  unvalidated(@Body() body: unknown) {
    return body;
  }

  @QueryMethod('search')
  search(@Body({ schema: SearchSchema }) body: z.output<typeof SearchSchema>) {
    return { got: body };
  }
}

/** Ruta que declara la versión 1 de forma explícita. */
@Public()
@Controller({ path: 'probe', version: '1' })
export class ExplicitV1Controller {
  @Get('explicit-v1')
  get() {
    return { explicit: true };
  }
}

/** Versión 2 de `ProbeController.ping`. */
@Public()
@Controller({ path: 'probe', version: '2' })
export class ProbeV2Controller {
  @Get('ping')
  ping() {
    return { version: 2 };
  }
}

@Public()
@Controller({ path: 'neutral', version: VERSION_NEUTRAL })
export class NeutralController {
  @Get()
  get() {
    return { neutral: true };
  }
}
