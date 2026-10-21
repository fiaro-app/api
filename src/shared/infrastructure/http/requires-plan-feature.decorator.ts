import { SetMetadata } from '@nestjs/common';
import type { PlanFeature } from '@/shared/domain/subscriptions/plan-features.js';

/** Clave del metadato que {@link RequiresPlanFeature} deja en la ruta. */
export const REQUIRED_PLAN_FEATURE = 'fiaro:required-plan-feature';

/**
 * Marca una ruta como propia de los planes que traen una función (D-151): `LenderScopeGuard`
 * responde `403 PLAN_FEATURE_UNAVAILABLE` a quien no la tiene. Va en el handler, en un controller con
 * `LenderScopeGuard`.
 *
 * @param feature - La función que exige.
 */
export const RequiresPlanFeature = (feature: PlanFeature) =>
  SetMetadata(REQUIRED_PLAN_FEATURE, feature);
