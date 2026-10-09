import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  LeadRateLimitedSchema,
  LeadValidationErrorSchema,
} from '@/modules/leads/infrastructure/controllers/schemas/lead-errors.schema.js';
import { LeadReceivedResponseSchema } from '@/modules/leads/infrastructure/controllers/schemas/lead-responses.schema.js';

/** Documenta `POST /leads`. */
export const ApiCreateLead = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Dejar un contacto para ventas',
      description:
        'Pública, sin sesión: el formulario «Contactar ventas» del sitio de marketing. Guarda el contacto y avisa por correo al equipo de ventas. Exige un celular colombiano o un correo. Tiene un límite propio de 5 contactos por hora por dirección IP, mucho más estricto que el general.',
    }),
    ApiResponse({
      status: 201,
      description: 'Contacto recibido.',
      standardSchema: LeadReceivedResponseSchema,
    }),
    ApiResponse({
      status: 400,
      description: 'Algún dato no cumple las reglas (`VALIDATION_FAILED`).',
      standardSchema: LeadValidationErrorSchema,
    }),
    ApiResponse({
      status: 429,
      description:
        'Demasiados contactos desde esta dirección (`RATE_LIMITED`). Reintenta pasado el tiempo de `Retry-After`.',
      standardSchema: LeadRateLimitedSchema,
    }),
  );
