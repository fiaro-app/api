import { SubscriptionStatusSchema } from '@fiaro-app/contracts';
import { z } from 'zod';
import { SUBSCRIPTION_PLAN_CODES } from '@/modules/subscriptions/domain/plans/plan-catalog.js';
import type { SubscriptionDetails } from '@/modules/subscriptions/application/dtos/subscription-details.dto.js';

/** Respuesta de `GET /subscription`: el plan del negocio, su estado y cuánto de él se usa. */
export const SubscriptionResponseSchema = z
  .object({
    planCode: z.enum(SUBSCRIPTION_PLAN_CODES).meta({
      description:
        'Qué plan es: `TRIAL` (la prueba inicial), `INDIVIDUAL`, `PRO` o `TEAM`.',
    }),
    status: SubscriptionStatusSchema.meta({
      description:
        '`ACTIVE` (período vigente), `GRACE_PERIOD` (venció hace menos de 7 días, todo funciona) o `READ_ONLY` (terminó la gracia).',
    }),
    currentPeriodEndsAt: z.iso.datetime({ offset: true }).meta({
      description: 'Hasta cuándo está pagado el período vigente.',
    }),
    graceEndsAt: z.iso.datetime({ offset: true }).meta({
      description: 'Fin del período más la gracia: desde ahí es solo lectura.',
    }),
    daysRemaining: z.int().min(0).meta({
      description: 'Días enteros para el fin del período; 0 si ya venció.',
    }),
    graceDaysRemaining: z.int().min(0).meta({
      description: 'Días enteros de gracia que quedan; 0 fuera de la gracia.',
    }),
    isReadOnly: z.boolean().meta({
      description:
        'Si el negocio está en solo lectura. Hoy la API solo lo informa: no bloquea escrituras (D-115).',
    }),
    limits: z
      .object({
        maxActiveLenders: z.int().meta({
          description: 'Cuántos prestamistas admite el plan.',
        }),
        maxCollectors: z.int().meta({
          description: 'Cuántos cobradores activos admite el plan.',
        }),
        maxAdmins: z.int().meta({
          description: 'Cuántos administradores admite cada prestamista.',
        }),
        maxPortfolios: z.int().meta({
          description:
            'Cuántas carteras admite cada prestamista, la «General» incluida.',
        }),
        maxActiveLoans: z.int().nullable().meta({
          description:
            'Cuántos préstamos activos admite cada prestamista; `null` si no hay tope.',
        }),
      })
      .meta({ description: 'Los topes del plan.' }),
    usage: z
      .object({
        activeLenders: z.int().meta({
          description: 'Prestamistas que tiene el negocio.',
        }),
        activeCollectors: z.int().meta({
          description:
            'Cobradores activos del prestamista de la sesión que ocupan cupo: la dueña no cuenta.',
        }),
        activeAdmins: z.int().meta({
          description:
            'Administradores activos del prestamista de la sesión (`LENDER` u `OWNER`): la dueña cuenta como uno.',
        }),
        activeLoans: z.int().meta({
          description: 'Préstamos activos del prestamista de la sesión.',
        }),
      })
      .meta({ description: 'Cuánto del plan usa el negocio hoy.' }),
    createdAt: z.iso.datetime({ offset: true }).meta({
      description: 'Cuándo empezó la suscripción.',
    }),
  })
  .meta({ id: 'SubscriptionResponse' });

/** @param details - La suscripción, tal como la devuelve el caso de uso. */
export function toSubscriptionResponse(
  details: SubscriptionDetails,
): z.output<typeof SubscriptionResponseSchema> {
  return {
    planCode: details.planCode,
    status: details.status,
    currentPeriodEndsAt: details.currentPeriodEndsAt.toISOString(),
    graceEndsAt: details.graceEndsAt.toISOString(),
    daysRemaining: details.daysRemaining,
    graceDaysRemaining: details.graceDaysRemaining,
    isReadOnly: details.isReadOnly,
    limits: { ...details.limits },
    usage: { ...details.usage },
    createdAt: details.createdAt.toISOString(),
  };
}
