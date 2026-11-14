import { describe, expect, it, vi } from 'vitest';
import { verifyLogo } from '@/modules/lenders/application/services/verify-logo.js';
import { InvalidLenderLogoError } from '@/modules/lenders/domain/errors/invalid-lender-logo.error.js';
import type { ObjectStoragePort } from '@/shared/application/ports/object-storage.port.js';

const LENDER = '0198f8e0-0000-7000-8000-000000000001';
const FILE = '0198f8e0-0000-7000-8000-0000000000aa';
const KEY = `logos/${LENDER}/${FILE}.png`;
const BASE = 'https://cdn.fiaro.co/';
const URL_OK = `${BASE}${KEY}`;
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function setup(info: Awaited<ReturnType<ObjectStoragePort['inspectObject']>>) {
  const deleteObject = vi.fn(() => Promise.resolve());
  const inspectObject = vi.fn(() => Promise.resolve(info));
  const storage = {
    keyFromPublicUrl: (url: string) =>
      url.startsWith(BASE) ? url.slice(BASE.length) : null,
    inspectObject,
    deleteObject,
  } as unknown as ObjectStoragePort;
  return { storage, deleteObject, inspectObject };
}

const GOOD = { sizeBytes: 5_000, contentType: 'image/png', head: PNG };

describe('verifyLogo', () => {
  it('acepta un PNG subido con la URL firmada de este negocio', async () => {
    const { storage, deleteObject } = setup(GOOD);

    await expect(verifyLogo(storage, LENDER, URL_OK)).resolves.toBeUndefined();
    expect(deleteObject).not.toHaveBeenCalled();
  });

  it('rechaza una URL de otro lado, de otro prestamista o con una llave inventada, sin consultar el bucket', async () => {
    const { storage, inspectObject } = setup(GOOD);
    const urls = [
      'https://evil.example/logo.png',
      `${BASE}logos/0198f8e0-0000-7000-8000-000000000002/${FILE}.png`,
      `${BASE}logos/${LENDER}/mi-logo.png`,
      'javascript:alert(1)',
    ];

    for (const url of urls) {
      await expect(verifyLogo(storage, LENDER, url)).rejects.toBeInstanceOf(
        InvalidLenderLogoError,
      );
    }
    expect(inspectObject).not.toHaveBeenCalled();
  });

  it('rechaza un logo que todavía no se subió', async () => {
    const { storage } = setup(null);

    await expect(verifyLogo(storage, LENDER, URL_OK)).rejects.toBeInstanceOf(
      InvalidLenderLogoError,
    );
  });

  it('borra del bucket y rechaza lo que pasó la URL firmada pero no es un PNG/JPEG de hasta 2 MB', async () => {
    const svg = new TextEncoder().encode('<svg onload="alert(1)">');
    const cases = [
      { ...GOOD, head: svg },
      { ...GOOD, sizeBytes: 3 * 1024 * 1024 },
      { ...GOOD, sizeBytes: 0 },
      { ...GOOD, contentType: 'text/html' },
      { ...GOOD, contentType: 'image/jpeg' },
    ];

    for (const info of cases) {
      const { storage, deleteObject } = setup(info);

      await expect(verifyLogo(storage, LENDER, URL_OK)).rejects.toBeInstanceOf(
        InvalidLenderLogoError,
      );
      expect(deleteObject).toHaveBeenCalledWith(KEY);
    }
  });
});
