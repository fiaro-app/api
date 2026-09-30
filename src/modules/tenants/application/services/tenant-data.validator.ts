import { TenantSchema } from '@fiaro-app/contracts';
import { InvalidTenantDataError } from '@/modules/tenants/domain/errors/invalid-tenant-data.error.js';
import {
  toIssuePath,
  zodIssueParams,
} from '@/shared/application/validation/zod-issue-params.js';

const TenantDataSchema = TenantSchema.pick({ name: true });

/** Datos del Tenant tal como los recibe el alta. */
export interface TenantDataInput {
  /** Nombre del negocio, con los espacios sobrantes que traiga. */
  readonly name: string;
}

/** Datos del Tenant ya validados y normalizados. */
export interface ValidTenantData {
  /** Nombre del negocio, sin espacios sobrantes. */
  readonly name: string;
}

/**
 * Valida el nombre del Tenant con el contrato compartido (`TenantSchema`).
 *
 * @param input - Datos del Tenant.
 * @returns El nombre normalizado, sin espacios sobrantes.
 * @throws {@link InvalidTenantDataError} Con un `issue` por cada campo que no cumple el contrato,
 * con los valores de la falla (`params`) para llenar los marcadores de su mensaje.
 */
export function validateTenantData(input: TenantDataInput): ValidTenantData {
  const result = TenantDataSchema.safeParse({ name: input.name });
  if (!result.success) {
    throw new InvalidTenantDataError(
      result.error.issues.map((issue) => ({
        path: toIssuePath(issue.path),
        message: issue.message,
        params: zodIssueParams(issue),
      })),
    );
  }
  return { name: result.data.name };
}
