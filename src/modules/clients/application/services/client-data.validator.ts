import { ClientSchema, normalizeNationalId } from '@fiaro-app/contracts';
import { InvalidClientDataError } from '@/modules/clients/domain/errors/invalid-client-data.error.js';
import {
  toIssuePath,
  zodIssueParams,
} from '@/shared/application/validation/zod-issue-params.js';

const ClientDataSchema = ClientSchema.pick({
  nationalId: true,
  fullName: true,
  occupation: true,
  phone: true,
  address: true,
});

/** Datos del cliente tal como los recibe el alta o la actualización. */
export interface ClientDataInput {
  /** Cédula, con los separadores que traiga (`"1.020.304.050"`). */
  readonly nationalId: string;
  /** Nombre completo, con los espacios sobrantes que traiga. */
  readonly fullName: string;
  /** Oficio del cliente. */
  readonly occupation: string;
  /** Celular o fijo colombiano en formato E.164. */
  readonly phone: string;
  /** Dirección de residencia o de cobro. */
  readonly address: string;
}

/** Datos del cliente ya validados y normalizados. */
export interface ValidClientData {
  /** Cédula, solo dígitos. */
  readonly nationalId: string;
  /** Nombre completo, sin espacios sobrantes. */
  readonly fullName: string;
  /** Oficio del cliente, sin espacios sobrantes. */
  readonly occupation: string;
  /** Celular o fijo colombiano en formato E.164. */
  readonly phone: string;
  /** Dirección, sin espacios sobrantes. */
  readonly address: string;
}

/**
 * Valida los datos del cliente con el contrato compartido (`ClientSchema`). La cédula se
 * normaliza antes de validar (quita puntos y espacios, como la escribe la gente al dictarla o
 * teclearla) con la misma función que ya publica `contracts` para este fin.
 *
 * @param input - Datos del cliente.
 * @returns Los datos normalizados.
 * @throws {@link InvalidClientDataError} Con un `issue` por cada campo que no cumple el contrato,
 * con los valores de la falla (`params`) para llenar los marcadores de su mensaje.
 */
export function validateClientData(input: ClientDataInput): ValidClientData {
  const result = ClientDataSchema.safeParse({
    nationalId: normalizeNationalId(input.nationalId),
    fullName: input.fullName,
    occupation: input.occupation,
    phone: input.phone,
    address: input.address,
  });
  if (!result.success) {
    throw new InvalidClientDataError(
      result.error.issues.map((issue) => ({
        path: toIssuePath(issue.path),
        message: issue.message,
        params: zodIssueParams(issue),
      })),
    );
  }
  return result.data;
}
