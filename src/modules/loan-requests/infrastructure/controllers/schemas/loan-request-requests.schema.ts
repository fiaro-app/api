import {
  AddressSchema,
  BusinessDateSchema,
  LoanFrequencySchema,
  NationalIdSchema,
  OccupationSchema,
  PageQuerySchema,
  PersonNameSchema,
  PhoneSchema,
  PositiveCopAmountSchema,
  normalizeNationalId,
} from '@fiaro-app/contracts';
import { z } from 'zod';
import { LOAN_REQUEST_STATUSES } from '@/modules/loan-requests/domain/entities/loan-request-status.js';

/** Cédula con o sin separadores: llega normalizada y ya validada. */
const NationalIdInputSchema = z
  .string()
  .transform(normalizeNationalId)
  .pipe(NationalIdSchema)
  .meta({
    description: 'Cédula de ciudadanía, con o sin separadores.',
    example: '1020304050',
  });

/** Los datos del cliente nuevo que el cobrador propone registrar. */
const NewClientSchema = z.strictObject({
  fullName: PersonNameSchema.meta({
    description: 'Nombre completo.',
    example: 'Carlos Andrés Gómez',
  }),
  occupation: OccupationSchema.meta({
    description: 'Oficio del cliente.',
    example: 'Vendedor ambulante',
  }),
  phone: PhoneSchema.meta({
    description: 'Celular o fijo colombiano en formato E.164.',
    example: '+573001234567',
  }),
  address: AddressSchema.meta({
    description: 'Dirección de residencia o de cobro.',
    example: 'Calle 45 # 12-30, Bogotá',
  }),
});

/** Las condiciones del préstamo, todas obligatorias. */
const LoanTermsShape = {
  principalAmount: PositiveCopAmountSchema.meta({
    description: 'Monto prestado, en pesos colombianos.',
    example: 500_000,
  }),
  installmentCount: z.int().min(1).meta({
    description: 'Número de cuotas pactadas.',
    example: 20,
  }),
  installmentValue: PositiveCopAmountSchema.meta({
    description: 'Valor de cada cuota, en pesos colombianos.',
    example: 30_000,
  }),
  totalPayable: PositiveCopAmountSchema.meta({
    description: 'Lo pactado en total.',
    example: 600_000,
  }),
  frequency: LoanFrequencySchema.meta({
    description: 'Cada cuánto se cobra una cuota.',
    example: 'DAILY',
  }),
  startDate: BusinessDateSchema.meta({
    description: 'Fecha de calendario en que arranca el préstamo.',
    example: '2026-10-01',
  }),
};

/** Cuerpo de `POST /loan-requests/client-lookup`. */
export const ClientLookupRequestSchema = z.strictObject({
  nationalId: NationalIdInputSchema,
});

/** Cuerpo de `POST /loan-requests`. */
export const CreateLoanRequestRequestSchema = z.strictObject({
  nationalId: NationalIdInputSchema,
  client: NewClientSchema.optional().meta({
    description:
      'Datos del cliente. Obligatorios solo si la cédula no es de un cliente del negocio; si lo es, se ignoran.',
  }),
  ...LoanTermsShape,
});

/** Cuerpo de `QUERY /loan-requests`: paginación y estado opcional. */
export const ListLoanRequestsRequestSchema = PageQuerySchema.extend({
  status: z.enum(LOAN_REQUEST_STATUSES).optional().meta({
    description: 'Solo las de este estado. Ausente para todas.',
  }),
});

/** Cuerpo de `POST /loan-requests/:id/approve`: ajustes opcionales del administrador. */
export const ApproveLoanRequestRequestSchema = z
  .strictObject({
    client: NewClientSchema.partial().optional().meta({
      description:
        'Ajustes a los datos del cliente nuevo. No aplican si el cliente ya existía.',
    }),
    loan: z.strictObject(LoanTermsShape).partial().optional().meta({
      description: 'Ajustes a las condiciones del préstamo.',
    }),
  })
  .prefault({});

/** Cuerpo de `POST /loan-requests/:id/reject`. */
export const RejectLoanRequestRequestSchema = z
  .strictObject({
    reason: z.string().trim().min(1).max(200).optional().meta({
      description: 'Por qué se rechaza. Se le muestra al cobrador.',
      example: 'El cliente ya tiene un préstamo en mora.',
    }),
  })
  .prefault({});
