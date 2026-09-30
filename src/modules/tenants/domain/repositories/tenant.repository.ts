import type { Tenant } from '@/modules/tenants/domain/entities/tenant.entity.js';

/** Puerto de persistencia de los Tenant. */
export interface TenantRepository {
  /** @param tenant - Tenant nuevo. */
  create(tenant: Tenant): Promise<void>;

  /**
   * @param id - Identificador del Tenant.
   * @returns El Tenant, o `null` si no existe.
   */
  findById(id: string): Promise<Tenant | null>;

  /**
   * @param name - Nombre del negocio. A diferencia del celular de `User`, no es único: dos
   * negocios pueden compartir nombre.
   * @returns El primer Tenant con ese nombre, o `null` si no hay ninguno.
   */
  findByName(name: string): Promise<Tenant | null>;
}
