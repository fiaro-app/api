import { Injectable } from '@nestjs/common';
import type { Lead } from '@/modules/leads/domain/entities/lead.entity.js';
import type { LeadRepository } from '@/modules/leads/domain/repositories/lead.repository.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/** Guarda los contactos de ventas en PostgreSQL con Prisma. */
@Injectable()
export class PrismaLeadRepository implements LeadRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** @param lead - Contacto nuevo. */
  async create(lead: Lead): Promise<void> {
    await this.prisma.lead.create({
      data: {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        message: lead.message,
        createdAt: lead.createdAt,
      },
    });
  }
}
