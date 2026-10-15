import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  S3Client,
} from '@aws-sdk/client-s3';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

describe('S3ObjectStorageAdapter: leer y borrar', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const body = (bytes: number[]) => ({
    transformToByteArray: () => Promise.resolve(Uint8Array.from(bytes)),
  });

  it('lee los primeros bytes y el tamaño real del objeto (de ContentRange)', async () => {
    const send = vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({
      ContentRange: 'bytes 0-15/48213',
      ContentType: 'image/png',
      Body: body([0x89, 0x50]),
    } as never);

    const info = await new S3ObjectStorageAdapter(CONFIG).inspectObject(
      'logos/l/a.png',
    );

    expect(info).toEqual({
      sizeBytes: 48_213,
      contentType: 'image/png',
      head: Uint8Array.from([0x89, 0x50]),
    });
    const command = send.mock.calls[0]?.[0] as GetObjectCommand;
    expect(command.input).toMatchObject({
      Bucket: 'fiaro-dev',
      Key: 'logos/l/a.png',
      Range: 'bytes=0-15',
    });
  });

  it('sin ContentRange usa ContentLength, y sin cuerpo devuelve cero bytes', async () => {
    vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({
      ContentLength: 7,
    } as never);

    const info = await new S3ObjectStorageAdapter(CONFIG).inspectObject(
      'a.png',
    );

    expect(info).toEqual({
      sizeBytes: 7,
      contentType: undefined,
      head: new Uint8Array(),
    });
  });

  it('sin tamaño en la respuesta lo cuenta como cero', async () => {
    vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({} as never);

    const info = await new S3ObjectStorageAdapter(CONFIG).inspectObject(
      'a.png',
    );

    expect(info?.sizeBytes).toBe(0);
  });

  it('un objeto que no existe devuelve null; otro error se propaga', async () => {
    const send = vi.spyOn(S3Client.prototype, 'send');
    send.mockRejectedValueOnce(new NoSuchKey({ message: 'no', $metadata: {} }));
    send.mockRejectedValueOnce(new Error('bucket caído'));
    const adapter = new S3ObjectStorageAdapter(CONFIG);

    await expect(adapter.inspectObject('a.png')).resolves.toBeNull();
    await expect(adapter.inspectObject('a.png')).rejects.toThrow(
      'bucket caído',
    );
  });

  it('borra el objeto de su bucket', async () => {
    const send = vi
      .spyOn(S3Client.prototype, 'send')
      .mockResolvedValue({} as never);

    await new S3ObjectStorageAdapter(CONFIG).deleteObject('logos/l/a.png');

    const command = send.mock.calls[0]?.[0] as DeleteObjectCommand;
    expect(command.input).toMatchObject({
      Bucket: 'fiaro-dev',
      Key: 'logos/l/a.png',
    });
  });
});
