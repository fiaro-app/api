import type { Provider } from '@nestjs/common';
import { IMPORT_LOOKUPS } from '@/modules/imports/application/ports/import-lookups.token.js';
import { ImportRowsUseCase } from '@/modules/imports/application/use-cases/import-rows.use-case.js';
import { PrismaImportLookups } from '@/modules/imports/infrastructure/persistence/prisma-import-lookups.js';

/** Proveedores del módulo `imports`. */
export const importsProviders: Provider[] = [
  { provide: IMPORT_LOOKUPS, useClass: PrismaImportLookups },
  ImportRowsUseCase,
];
