import { boundedDateRange } from '@fiaro-app/contracts';
import { z } from 'zod';
import type { LenderInsights } from '@/modules/dashboard/application/dtos/lender-insights.dto.js';
import { DATE_RANGE_LIMITS } from '@/shared/infrastructure/http/schemas/date-range-limits.js';

/** Cuerpo de `QUERY /lenders/me/stats/insights`. */
export const GetLenderInsightsRequestSchema = z.strictObject({
  dateRange: boundedDateRange(DATE_RANGE_LIMITS.stats).optional().meta({
    description:
      'Período a consultar. Ausente para el mes actual (desde el día 1 hasta hoy).',
  }),
});

const money = (description: string) =>
  z.int().nonnegative().meta({ description });
const rate = (description: string) =>
  z.number().min(0).max(1).nullable().meta({ description });

const SettlementIntegritySchema = z.object({
  submitted: z
    .int()
    .nonnegative()
    .meta({ description: 'Cuadres enviados en el período.' }),
  balanced: z
    .int()
    .nonnegative()
    .meta({ description: 'De esos, los que cuadraron exacto.' }),
  withDifference: z
    .int()
    .nonnegative()
    .meta({ description: 'Los que no cuadraron.' }),
  shortfall: money('Suma de lo que faltó en los cuadres cortos.'),
  surplus: money('Suma de lo que sobró en los cuadres con exceso.'),
});

/** Respuesta de `QUERY /lenders/me/stats/insights`. */
export const LenderInsightsResponseSchema = z
  .object({
    from: z.iso.date().meta({ description: 'Primera fecha del período.' }),
    to: z.iso.date().meta({ description: 'Última fecha del período.' }),
    daily: z
      .array(
        z.object({
          date: z.iso.date(),
          expected: money('Lo que vencía ese día según el calendario.'),
          collected: money('Lo que se cobró ese día, sin reversiones.'),
        }),
      )
      .meta({
        description: 'Un punto por día del período, aunque no haya movimiento.',
      }),
    income: z.object({
      collected: money('Lo cobrado en el período, sin reversiones.'),
      byMethod: z.object({
        CASH: money('Efectivo.'),
        NEQUI: money('Nequi.'),
        TRANSFER: money('Transferencia.'),
      }),
      interest: money('La parte de lo cobrado que es interés (ganancia).'),
      principalRecovered: money(
        'La parte de lo cobrado que es capital que regresa.',
      ),
      interestShare: rate(
        'Interés sobre lo cobrado, de 0 a 1; null si no se cobró nada.',
      ),
    }),
    origination: z.object({
      loansCreated: z
        .int()
        .nonnegative()
        .meta({ description: 'Préstamos con fecha de inicio en el período.' }),
      amountLent: money('Capital prestado.'),
      averageTicket: z.int().nonnegative().nullable().meta({
        description: 'Capital promedio por préstamo; null sin préstamos.',
      }),
      agreedInterest: money(
        'Interés pactado de esos préstamos (lo que devuelven de más sobre el capital).',
      ),
    }),
    visits: z.object({
      PAID: z.int().nonnegative(),
      NOT_FOUND: z.int().nonnegative(),
      REFUSED: z.int().nonnegative(),
      RESCHEDULED: z.int().nonnegative(),
      total: z.int().nonnegative(),
      contactRate: rate(
        'Visitas en las que se encontró al cliente sobre el total; null sin visitas.',
      ),
      paidRate: rate(
        'Visitas que terminaron en pago sobre el total; null sin visitas.',
      ),
    }),
    settlements: SettlementIntegritySchema,
    forecast: z
      .array(
        z.object({
          date: z.iso.date(),
          expected: money('Lo que vence ese día.'),
        }),
      )
      .meta({
        description: 'Lo que vence en los próximos 7 días, desde mañana.',
      }),
    previous: z
      .object({
        from: z.iso.date(),
        to: z.iso.date(),
        collected: money('Lo cobrado en el período anterior.'),
        interest: money('El interés cobrado en el período anterior.'),
        loansCreated: z.int().nonnegative(),
        amountLent: money('Capital prestado en el período anterior.'),
      })
      .meta({
        description:
          'El período anterior de la misma duración, para la tendencia.',
      }),
  })
  .meta({ id: 'LenderInsightsResponse' });

/** @param insights - Lo que devuelve el caso de uso. */
export function toLenderInsightsResponse(
  insights: LenderInsights,
): z.output<typeof LenderInsightsResponseSchema> {
  return {
    ...insights,
    daily: insights.daily.map((point) => ({ ...point })),
    income: { ...insights.income, byMethod: { ...insights.income.byMethod } },
    origination: { ...insights.origination },
    visits: { ...insights.visits },
    settlements: { ...insights.settlements },
    forecast: insights.forecast.map((day) => ({ ...day })),
    previous: { ...insights.previous },
  };
}
