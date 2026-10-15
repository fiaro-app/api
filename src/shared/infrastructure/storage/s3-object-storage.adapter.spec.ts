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
      { contentType: 'image/png', sizeBytes: 48_000 },
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

    const a = await adapter.getPresignedUploadUrl('a.png', {
      contentType: 'image/png',
      sizeBytes: 10,
    });
    const b = await adapter.getPresignedUploadUrl('b.png', {
      contentType: 'image/png',
      sizeBytes: 10,
    });

    expect(a.uploadUrl).not.toBe(b.uploadUrl);
  });

  it('firma el tipo y el peso: el bucket rechaza una subida distinta de lo pedido', async () => {
    const adapter = new S3ObjectStorageAdapter(CONFIG);

    const { uploadUrl } = await adapter.getPresignedUploadUrl('a.png', {
      contentType: 'image/png',
      sizeBytes: 48_000,
    });

    const signed = new URL(uploadUrl).searchParams.get('X-Amz-SignedHeaders');
    expect(signed?.split(';').sort()).toEqual([
      'content-length',
      'content-type',
      'host',
    ]);
  });

  it('reconoce la llave de un objeto solo si la URL es de este bucket', () => {
    const adapter = new S3ObjectStorageAdapter(CONFIG);
    const base = CONFIG.publicUrlBase;

    expect(adapter.keyFromPublicUrl(`${base}/logos/l/a.png`)).toBe(
      'logos/l/a.png',
    );
    expect(
      adapter.keyFromPublicUrl('https://evil.example/logos/l/a.png'),
    ).toBeNull();
    expect(adapter.keyFromPublicUrl(`${base}x/logos/l/a.png`)).toBeNull();
    expect(adapter.keyFromPublicUrl(`${base}/`)).toBeNull();
    expect(adapter.keyFromPublicUrl('javascript:alert(1)')).toBeNull();
  });
});
