import { describe, expect, it } from 'vitest';
import type { PresignedUpload } from '@/shared/application/ports/object-storage.port.js';
import { toLenderLogoUploadUrlResponse } from '@/modules/lenders/infrastructure/controllers/schemas/lender-logo-responses.schema.js';

describe('toLenderLogoUploadUrlResponse', () => {
  it('convierte la URL firmada, con la fecha de vencimiento en ISO', () => {
    const upload: PresignedUpload = {
      uploadUrl: 'https://bucket.example/signed',
      publicUrl: 'https://assets.example/logos/lender-1/id-1.png',
      expiresAt: new Date('2026-10-07T15:05:00Z'),
    };

    expect(toLenderLogoUploadUrlResponse(upload)).toEqual({
      uploadUrl: 'https://bucket.example/signed',
      publicUrl: 'https://assets.example/logos/lender-1/id-1.png',
      expiresAt: '2026-10-07T15:05:00.000Z',
    });
  });
});
