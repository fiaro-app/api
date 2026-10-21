import { z } from 'zod';
import {
  IMPORT_FREQUENCIES,
  IMPORT_MAX_ROWS,
} from '@/modules/imports/domain/import-row.js';

/** Un préstamo en curso de una fila: laxo a propósito, el detalle lo revisa cada fila (D-152). */
const ImportLoanRequestSchema = z.strictObject({
  remainingInstallments: z.number().meta({
    description: 'Cuotas que faltan por cobrar.',
    example: 12,
  }),
  installmentValue: z.number().meta({
    description: 'Valor de cada cuota, en pesos.',
    example: 30_000,
  }),
  frequency: z.enum(IMPORT_FREQUENCIES).meta({
    description: 'Cada cuánto se cobra una cuota.',
    example: 'WEEKLY',
  }),
  nextInstallmentDate: z.string().max(10).meta({
    description: 'Fecha `AAAA-MM-DD` de la próxima cuota.',
    example: '2026-11-03',
  }),
  pendingCapital: z.number().nullish().meta({
    description:
      'Capital que falta, si se sabe; sin él se toma lo que falta por pagar.',
  }),
  collectorPhone: z.string().max(30).nullish().meta({
    description:
      'Celular del cobrador al que se asigna; sin él queda sin asignar.',
  }),
});

/** Una fila de la hoja. Los textos se revisan fila por fila, no tumban toda la petición. */
const ImportRowRequestSchema = z.strictObject({
  nationalId: z.string().max(40).meta({ example: '1020304050' }),
  fullName: z.string().max(200).meta({ example: 'María Pérez' }),
  occupation: z.string().max(200).meta({ example: 'Tendera' }),
  phone: z.string().max(30).meta({ example: '3001234567' }),
  address: z.string().max(300).meta({ example: 'Calle 1 # 2-3' }),
  loan: ImportLoanRequestSchema.nullish(),
});

/** Cuerpo de `POST /imports`. */
export const ImportRequestSchema = z
  .strictObject({
    dryRun: z.boolean().meta({
      description:
        '`true` solo revisa y cuenta (vista previa); `false` crea los clientes y préstamos.',
    }),
    rows: z
      .array(ImportRowRequestSchema)
      .min(1)
      .max(IMPORT_MAX_ROWS)
      .meta({
        description: `Hasta ${String(IMPORT_MAX_ROWS)} filas por petición.`,
      }),
  })
  .meta({ id: 'ImportRequest' });
