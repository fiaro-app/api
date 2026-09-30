import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  RegistrationConflictSchema,
  RegistrationValidationErrorSchema,
} from '@/modules/tenants/infrastructure/controllers/schemas/registration-errors.schema.js';
import { RegisterOwnerResponseSchema } from '@/modules/tenants/infrastructure/controllers/schemas/registration-responses.schema.js';

/** Documenta `POST /register`. */
export const ApiRegisterOwner = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Registrar un negocio nuevo',
      description:
        'Público, sin sesión. Da de alta a la persona y, con su id, su negocio: un Tenant, su primer prestamista y la membresía de dueño con los tres roles (OWNER, LENDER, COLLECTOR). No inicia sesión: hay que llamar después a `POST /auth/sign-in/phone-number` con el mismo celular y contraseña.',
    }),
    ApiResponse({
      status: 201,
      description: 'Persona y negocio creados.',
      standardSchema: RegisterOwnerResponseSchema,
    }),
    ApiResponse({
      status: 400,
      description:
        'El cuerpo no cumple el contrato, el celular no es un celular colombiano, la contraseña no tiene la longitud permitida o es demasiado fácil de adivinar.',
      standardSchema: RegistrationValidationErrorSchema,
    }),
    ApiResponse({
      status: 409,
      description:
        'Ya existe una cuenta con ese celular (`PHONE_ALREADY_REGISTERED`).',
      standardSchema: RegistrationConflictSchema,
    }),
  );
