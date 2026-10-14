import { Injectable } from '@nestjs/common';
import type { Client } from '@/modules/clients/domain/entities/client.entity.js';
import { ClientNationalIdTakenError } from '@/modules/clients/domain/errors/client-national-id-taken.error.js';
import type {
  ClientRepository,
  ClientsPage,
  ListClientsCriteria,
} from '@/modules/clients/domain/repositories/client.repository.js';
import {
  toClient,
  toClientCreateInput,
} from '@/modules/clients/infrastructure/persistence/client.mapper.js';
import { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/** Código de Prisma para una restricción de unicidad violada. */
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/** Guarda a los clientes en PostgreSQL con Prisma. */
@Injectable()
export class PrismaClientRepository implements ClientRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @remarks
   * La única restricción de unicidad de un cliente es `(lenderId, nationalId)`: cualquier
   * `P2002` en este `create` significa que la cédula ya la usa otro cliente del mismo
   * prestamista.
   *
   * @param client - Cliente nuevo.
   * @throws {@link ClientNationalIdTakenError} Si la cédula ya la usa otro cliente del mismo
   * prestamista.
   */
  async create(client: Client): Promise<void> {
    try {
      await this.prisma.client.create({ data: toClientCreateInput(client) });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new ClientNationalIdTakenError();
      }
      throw error;
    }
  }

  /**
   * @param id - Identificador del cliente.
   * @param lenderId - El prestamista dueño.
   */
  async findById(id: string, lenderId: string): Promise<Client | null> {
    const row = await this.prisma.client.findFirst({
      where: { id, lenderId },
    });
    return row === null ? null : toClient(row);
  }

  /** @param criteria - Prestamista, paginación y búsqueda opcional. */
  async list(criteria: ListClientsCriteria): Promise<ClientsPage> {
    const search = criteria.search?.trim();
    const where: Prisma.ClientWhereInput = {
      lenderId: criteria.lenderId,
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { nationalId: { contains: search } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (criteria.page - 1) * criteria.pageSize,
        take: criteria.pageSize,
      }),
      this.prisma.client.count({ where }),
    ]);
    return { items: rows.map(toClient), total };
  }

  /**
   * @param client - Cliente con sus datos ya actualizados.
   * @throws {@link ClientNationalIdTakenError} Si la cédula nueva ya la usa otro cliente del
   * mismo prestamista.
   */
  async update(client: Client): Promise<void> {
    try {
      await this.prisma.client.update({
        where: { id: client.id, lenderId: client.lenderId },
        data: toClientCreateInput(client),
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new ClientNationalIdTakenError();
      }
      throw error;
    }
  }
}
