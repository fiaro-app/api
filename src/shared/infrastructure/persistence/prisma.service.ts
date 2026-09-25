import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import type { Env } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';
import { PrismaClient } from '@/shared/infrastructure/persistence/generated/client.js';

/**
 * Cliente de Prisma del proyecto. Conecta con la primera consulta, no al arrancar, y se
 * desconecta al cerrar la aplicación.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(ENV) env: Env) {
    super({ adapter: new PrismaPg({ connectionString: env.databaseUrl }) });
  }

  /** Cierra las conexiones a PostgreSQL al apagar la aplicación. */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
