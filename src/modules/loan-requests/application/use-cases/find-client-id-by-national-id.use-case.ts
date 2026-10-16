import { Injectable } from '@nestjs/common';
import { normalizeNationalId } from '@fiaro-app/contracts';
import { ListClientsUseCase } from '@/modules/clients/application/use-cases/list-clients.use-case.js';

/** Cuántos candidatos trae la búsqueda por texto antes de comparar la cédula exacta. */
const CANDIDATES = 10;

/**
 * Dice si una cédula ya es de un cliente del negocio. Lo usan la consulta del cobrador ("¿ya
 * existe?") y la solicitud; así el cobrador sabe si registrar o no, sin ver los datos de un
 * cliente que no conoce.
 */
@Injectable()
export class FindClientIdByNationalIdUseCase {
  constructor(private readonly listClients: ListClientsUseCase) {}

  /**
   * @param lenderId - El prestamista dueño.
   * @param nationalId - Cédula, con los separadores que traiga.
   * @returns El `id` del cliente con esa cédula exacta, o `null` si el negocio no la tiene.
   */
  async execute(lenderId: string, nationalId: string): Promise<string | null> {
    const normalized = normalizeNationalId(nationalId);
    const page = await this.listClients.execute({
      lenderId,
      page: 1,
      pageSize: CANDIDATES,
      search: normalized,
    });
    return (
      page.items.find((client) => client.nationalId === normalized)?.id ?? null
    );
  }
}
