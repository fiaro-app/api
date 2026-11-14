import { z } from 'zod';
import { integer } from '@/config/env-fields.js';

/**
 * Variables de entorno de la suscripción: la prueba (D-115) y el cobro con Wompi (D-149). Las de
 * Wompi son opcionales: sin ellas el cobro queda apagado.
 */
export const BILLING_ENV_SHAPE = {
  SUBSCRIPTION_TRIAL_DAYS: integer(1, 3650).default(30),
  SUBSCRIPTION_TRIAL_MAX_ACTIVE_LENDERS: integer(1, 1000).default(1),
  SUBSCRIPTION_TRIAL_MAX_COLLECTORS: integer(1, 100_000).default(5),
  WOMPI_PUBLIC_KEY: z.string().min(1).optional(),
  WOMPI_INTEGRITY_SECRET: z.string().min(1).optional(),
  WOMPI_EVENTS_SECRET: z.string().min(1).optional(),
  WOMPI_CHECKOUT_URL: z.url().default('https://checkout.wompi.co/p/'),
  WOMPI_REDIRECT_URL: z.url().optional(),
};

/**
 * Las cuatro llaves van juntas o ninguna: una configuración a medias cobraría con firmas que Wompi
 * rechazaría, o no comprobaría sus avisos.
 *
 * @param env - Las variables ya leídas.
 * @param ctx - Donde se anota el error.
 */
export function checkWompiKeys(
  env: {
    readonly WOMPI_PUBLIC_KEY?: string | undefined;
    readonly WOMPI_INTEGRITY_SECRET?: string | undefined;
    readonly WOMPI_EVENTS_SECRET?: string | undefined;
    readonly WOMPI_REDIRECT_URL?: string | undefined;
  },
  ctx: z.RefinementCtx,
): void {
  const set = [
    env.WOMPI_PUBLIC_KEY,
    env.WOMPI_INTEGRITY_SECRET,
    env.WOMPI_EVENTS_SECRET,
    env.WOMPI_REDIRECT_URL,
  ].filter(Boolean).length;
  if (set !== 0 && set !== 4) {
    ctx.addIssue({
      code: 'custom',
      path: ['WOMPI_PUBLIC_KEY'],
      message:
        'el cobro con Wompi necesita las cuatro juntas (WOMPI_PUBLIC_KEY, WOMPI_INTEGRITY_SECRET, WOMPI_EVENTS_SECRET y WOMPI_REDIRECT_URL) o ninguna',
    });
  }
}
