import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiUnauthenticatedResponse } from '@/modules/memberships/infrastructure/controllers/docs/membership-common-responses.docs.js';
import { MembershipResponseSchema } from '@/modules/memberships/infrastructure/controllers/schemas/membership-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** Documenta `GET /memberships/me`. */
export const ApiGetOwnMembership = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Mi membresía',
      description:
        'La membresía activa de quien llama, con sus roles y su cartera. La puede pedir cualquier rol, también un cobrador: así las apps saben si abrir el panel del administrador o la ruta del cobrador.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'La membresía de la sesión.',
      standardSchema: MembershipResponseSchema,
    }),
    ApiUnauthenticatedResponse(),
  );
