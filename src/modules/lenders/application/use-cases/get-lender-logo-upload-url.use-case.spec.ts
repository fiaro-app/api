import { describe, expect, it, vi } from 'vitest';
import { GetLenderLogoUploadUrlUseCase } from '@/modules/lenders/application/use-cases/get-lender-logo-upload-url.use-case.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import type {
  ObjectStoragePort,
  PresignedUpload,
} from '@/shared/application/ports/object-storage.port.js';

const UPLOAD: PresignedUpload = {
  uploadUrl: 'https://bucket.example/signed',
  publicUrl: 'https://assets.example/logos/lender-1/id-1.png',
  expiresAt: new Date('2026-10-07T15:05:00Z'),
};

function setup() {
  const getPresignedUploadUrl = vi.fn(() => Promise.resolve(UPLOAD));
  const storage = {
    getPresignedUploadUrl,
  } as unknown as ObjectStoragePort;
  const ids = { next: vi.fn(() => 'id-1') } as unknown as IdGenerator;
  const useCase = new GetLenderLogoUploadUrlUseCase(storage, ids);
  return { useCase, getPresignedUploadUrl };
}

describe('GetLenderLogoUploadUrlUseCase', () => {
  it('arma la llave con el prestamista y un id nuevo, con la extensión del PNG', async () => {
    const { useCase, getPresignedUploadUrl } = setup();

    const result = await useCase.execute({
      lenderId: 'lender-1',
      contentType: 'image/png',
      sizeBytes: 48_000,
    });

    expect(getPresignedUploadUrl).toHaveBeenCalledExactlyOnceWith(
      'logos/lender-1/id-1.png',
      { contentType: 'image/png', sizeBytes: 48_000 },
    );
    expect(result).toEqual(UPLOAD);
  });

  it('con JPEG, usa la extensión .jpg', async () => {
    const { useCase, getPresignedUploadUrl } = setup();

    await useCase.execute({
      lenderId: 'lender-1',
      contentType: 'image/jpeg',
      sizeBytes: 1_000,
    });

    expect(getPresignedUploadUrl).toHaveBeenCalledExactlyOnceWith(
      'logos/lender-1/id-1.jpg',
      { contentType: 'image/jpeg', sizeBytes: 1_000 },
    );
  });
});
