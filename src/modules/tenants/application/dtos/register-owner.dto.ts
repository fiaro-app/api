import type { CreatedUser } from '@/modules/auth/application/dtos/create-user.dto.js';
import type { CreatedTenant } from '@/modules/tenants/application/dtos/create-tenant.dto.js';

/** Datos con los que alguien registra su negocio. */
export interface RegisterOwnerInput {
  /** Celular en formato E.164 (`+573001234567`); será el usuario de inicio de sesión. */
  readonly phone: string;
  /** Nombre completo de quien registra. */
  readonly fullName: string;
  /** Contraseña en claro. Cumple la política de contraseñas y solo se guarda su hash. */
  readonly password: string;
  /**
   * Cédula de ciudadanía. Obligatoria aquí (a diferencia del alta genérica de personas): quien
   * se registra recibe los tres roles, `COLLECTOR` incluido, y ese rol la exige (PRODUCT.md §5).
   */
  readonly nationalId: string;
  /** Correo real, opcional: sirve para recuperar la contraseña más adelante (D-68). */
  readonly contactEmail?: string | null;
  /** Nombre del negocio: se guarda igual en el Tenant y en su primer Lender (D-72). */
  readonly businessName: string;
  /** Qué documentos legales vio y si aceptó recibir novedades (las tres aceptaciones obligatorias ya vienen validadas). */
  readonly legal: {
    readonly version: string;
    readonly marketing: boolean;
    readonly ipAddress: string | null;
    readonly userAgent: string | null;
  };
}

/** Lo que devuelve el registro: la persona y el negocio recién creados. */
export interface RegisteredOwner {
  /** La persona que se registró. */
  readonly user: CreatedUser;
  /** El Tenant, su primer prestamista y la membresía de dueño, recién creados. */
  readonly tenant: CreatedTenant;
}
