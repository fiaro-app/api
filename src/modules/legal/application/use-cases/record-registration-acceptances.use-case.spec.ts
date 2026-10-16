import { describe, expect, it, vi } from 'vitest';
import { RecordRegistrationAcceptancesUseCase } from '@/modules/legal/application/use-cases/record-registration-acceptances.use-case.js';
import { OutdatedLegalVersionError } from '@/modules/legal/domain/errors/outdated-legal-version.error.js';
import { CURRENT_LEGAL_VERSION } from '@/modules/legal/domain/legal-document.js';

function setup() {
  const recordMany = vi.fn(() => Promise.resolve());
  let next = 0;
  const useCase = new RecordRegistrationAcceptancesUseCase(
    { recordMany },
    { next: () => `id-${String((next += 1))}` },
  );
  return { useCase, recordMany };
}

const INPUT = {
  userId: 'u1',
  version: CURRENT_LEGAL_VERSION,
  marketing: false,
  ipAddress: '10.0.0.1',
  userAgent: 'vitest',
};

describe('RecordRegistrationAcceptancesUseCase', () => {
  it('guarda las tres aceptaciones obligatorias con su versión, IP y dispositivo', async () => {
    const { useCase, recordMany } = setup();

    await useCase.execute(INPUT);

    expect(recordMany).toHaveBeenCalledExactlyOnceWith([
      {
        id: 'id-1',
        userId: 'u1',
        document: 'TERMS',
        version: CURRENT_LEGAL_VERSION,
        ipAddress: '10.0.0.1',
        userAgent: 'vitest',
      },
      {
        id: 'id-2',
        userId: 'u1',
        document: 'PRIVACY',
        version: CURRENT_LEGAL_VERSION,
        ipAddress: '10.0.0.1',
        userAgent: 'vitest',
      },
      {
        id: 'id-3',
        userId: 'u1',
        document: 'DATA_RESPONSIBILITY',
        version: CURRENT_LEGAL_VERSION,
        ipAddress: '10.0.0.1',
        userAgent: 'vitest',
      },
    ]);
  });

  it('agrega la autorización de novedades solo si la dio', async () => {
    const { useCase, recordMany } = setup();

    await useCase.execute({ ...INPUT, marketing: true });

    const rows = recordMany.mock.calls[0] as unknown as [
      { document: string }[],
    ];
    expect(rows[0].map((row) => row.document)).toEqual([
      'TERMS',
      'PRIVACY',
      'DATA_RESPONSIBILITY',
      'MARKETING',
    ]);
  });

  it('assertCurrent acepta la versión vigente y rechaza una vieja', () => {
    const { useCase } = setup();

    expect(() => {
      useCase.assertCurrent(CURRENT_LEGAL_VERSION);
    }).not.toThrow();
    expect(() => {
      useCase.assertCurrent('2020-01-01');
    }).toThrow(OutdatedLegalVersionError);
  });
});
