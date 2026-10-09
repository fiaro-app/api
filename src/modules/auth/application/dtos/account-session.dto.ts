import type { DeviceDescription } from '@/modules/auth/domain/policies/device-description.js';

/** Una sesión abierta de la persona, lista para mostrar en «Mi cuenta». */
export interface AccountSession {
  /** Identificador de la sesión. */
  readonly id: string;
  /** Si es la sesión desde la que se hizo la consulta: «Esta sesión». */
  readonly isCurrent: boolean;
  /** Qué dispositivo es, a partir de su `User-Agent`. */
  readonly device: DeviceDescription;
  /** IP desde la que se abrió, o `null` si no se registró. */
  readonly ipAddress: string | null;
  /** Cuándo se abrió. */
  readonly createdAt: Date;
  /** Último uso, con precisión de un día (la sesión se renueva como máximo una vez al día). */
  readonly lastUsedAt: Date;
  /** Cuándo vence si no se usa. */
  readonly expiresAt: Date;
}
