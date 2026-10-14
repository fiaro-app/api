import { normalizeNationalId, UserSchema } from '@fiaro-app/contracts';
import { InvalidUserDataError } from '@/modules/auth/domain/errors/invalid-user-data.error.js';
import {
  toIssuePath,
  zodIssueParams,
} from '@/shared/application/validation/zod-issue-params.js';

/** Los datos de la persona que valida el contrato compartido (`UserSchema`). */
const UserDataSchema = UserSchema.pick({
  fullName: true,
  email: true,
  nationalId: true,
});

/** Datos de la persona tal como los recibe el alta. */
export interface UserDataInput {
  /** Nombre completo, con los espacios sobrantes que traiga. */
  readonly fullName: string;
  /** Correo real de la persona; ausente o `null` si no lo hay. */
  readonly contactEmail?: string | null;
  /** Cédula de ciudadanía; ausente o `null` si no la hay. */
  readonly nationalId?: string | null;
}

/** Datos de la persona ya validados y normalizados. */
export interface ValidUserData {
  /** Nombre completo, sin espacios sobrantes. */
  readonly fullName: string;
  /** Correo real de la persona, o `null` si no lo hay. */
  readonly contactEmail: string | null;
  /** Cédula de ciudadanía, o `null` si no la hay. */
  readonly nationalId: string | null;
}

/**
 * Valida el nombre, el email y la cédula con el contrato compartido (`UserSchema`), la misma
 * regla que aplican las apps antes de enviarlos. La cédula se normaliza (quita puntos y
 * espacios, `normalizeNationalId`) antes de validar, porque así la escribe la gente.
 *
 * @param input - Datos de la persona. El email y la cédula son opcionales.
 * @returns Los datos normalizados: el nombre sin espacios sobrantes y `null` en lo que falte.
 * @throws {@link InvalidUserDataError} Con un `issue` por cada campo que no cumple el contrato, con
 * los valores de la falla (`params`) para llenar los marcadores de su mensaje.
 */
export function validateUserData(input: UserDataInput): ValidUserData {
  const result = UserDataSchema.safeParse({
    fullName: input.fullName,
    email: input.contactEmail ?? null,
    nationalId: input.nationalId ? normalizeNationalId(input.nationalId) : null,
  });
  if (!result.success) {
    throw new InvalidUserDataError(
      result.error.issues.map((issue) => ({
        path: toIssuePath(issue.path),
        message: issue.message,
        params: zodIssueParams(issue),
      })),
    );
  }
  return {
    fullName: result.data.fullName,
    contactEmail: result.data.email,
    nationalId: result.data.nationalId,
  };
}
