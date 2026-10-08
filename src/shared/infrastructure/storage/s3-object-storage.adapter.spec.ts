import { describe, expect, it } from 'vitest';
import { S3ObjectStorageAdapter } from '@/shared/infrastructure/storage/s3-object-storage.adapter.js';

const CONFIG = {
  endpoint: 'http://localhost:8333',
  region: 'auto',
  bucket: 'fiaro-dev',
  accessKeyId: 'fiaro',
  secretAccessKey: 'fiaro-secret',
  publicUrlBase: 'http://localhost:8333/fiaro-dev',
};

describe('S3ObjectStorageAdapter', () => {
  it('firma una URL de subida, sin red: se calcula por criptografía', async () => {
    const adapter = new S3ObjectStorageAdapter(CONFIG);
    const before = Date.now();

    const result = await adapter.getPresignedUploadUrl(
      'logos/lender-1/abc.png',
      'image/png',
    );

    expect(result.uploadUrl).toMatch(
      /^http:\/\/localhost:8333\/fiaro-dev\/logos\/lender-1\/abc\.png\?/,
    );
    expect(result.uploadUrl).toContain('X-Amz-Signature=');
    expect(result.publicUrl).toBe(
      'http://localhost:8333/fiaro-dev/logos/lender-1/abc.png',
    );
    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 299_000);
    expect(result.expiresAt.getTime()).toBeLessThanOrEqual(before + 301_000);
  });

  it('firma distinto para cada llave', async () => {
    const adapter = new S3ObjectStorageAdapter(CONFIG);

    const a = await adapter.getPresignedUploadUrl('a.png', 'image/png');
    const b = await adapter.getPresignedUploadUrl('b.png', 'image/png');

    expect(a.uploadUrl).not.toBe(b.uploadUrl);
  });
});
