import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { ImportRowsUseCase } from '@/modules/imports/application/use-cases/import-rows.use-case.js';
import { ImportController } from '@/modules/imports/infrastructure/controllers/import.controller.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import type { TranslationService } from '@/shared/infrastructure/i18n/translation.service.js';

const OUTCOME = {
  dryRun: true,
  summary: { rows: 1, ok: 0, invalid: 1, failed: 0, newClients: 0, loans: 0 },
  rows: [
    {
      row: 1,
      status: 'INVALID' as const,
      client: null,
      loan: false,
      issues: [
        { field: 'phone', message: 'errors.X' },
        { field: 'row', message: 'Ya escrito' },
      ],
    },
  ],
};

const BODY = { dryRun: true, rows: [] };

function setup() {
  const importRows = { execute: vi.fn(() => Promise.resolve(OUTCOME)) };
  const translator = {
    find: vi.fn((key: string) =>
      key === 'errors.X' ? 'Traducido' : undefined,
    ),
  };
  const controller = new ImportController(
    importRows as unknown as ImportRowsUseCase,
    translator as unknown as TranslationService,
  );
  return { controller, importRows };
}

const scopeWith = (roles: readonly string[]): LenderScope => ({
  membershipId: 'membership-1',
  lenderId: 'lender-1',
  roles,
});

describe('ImportController', () => {
  it('con rol LENDER importa y traduce los mensajes que son claves', async () => {
    const { controller, importRows } = setup();

    const response = await controller.import(BODY, scopeWith(['LENDER']));

    expect(importRows.execute).toHaveBeenCalledWith({
      lenderId: 'lender-1',
      membershipId: 'membership-1',
      dryRun: true,
      rows: [],
    });
    expect(response.rows[0]?.issues).toEqual([
      { field: 'phone', message: 'Traducido' },
      { field: 'row', message: 'Ya escrito' },
    ]);
  });

  it('con solo el rol COLLECTOR responde 403 sin llamar al caso de uso', async () => {
    const { controller, importRows } = setup();

    await expect(
      controller.import(BODY, scopeWith(['COLLECTOR'])),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(importRows.execute).not.toHaveBeenCalled();
  });
});
