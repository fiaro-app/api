import { describe, expect, it } from 'vitest';
import { GetLenderLogoUploadUrlRequestSchema } from '@/modules/lenders/infrastructure/controllers/schemas/lender-logo-requests.schema.js';

describe('GetLenderLogoUploadUrlRequestSchema', () => {
  it.each(['image/png', 'image/jpeg'])(
    'acepta contentType %s',
    (contentType) => {
      expect(
        GetLenderLogoUploadUrlRequestSchema.safeParse({
          contentType,
          sizeBytes: 1000,
        }).success,
      ).toBe(true);
    },
  );

  it('rechaza un contentType que no sea imagen PNG o JPEG', () => {
    expect(
      GetLenderLogoUploadUrlRequestSchema.safeParse({
        contentType: 'application/pdf',
        sizeBytes: 1000,
      }).success,
    ).toBe(false);
  });

  it('rechaza sin contentType', () => {
    expect(GetLenderLogoUploadUrlRequestSchema.safeParse({}).success).toBe(
      false,
    );
  });

  it('rechaza un campo que la ruta no declara', () => {
    expect(
      GetLenderLogoUploadUrlRequestSchema.safeParse({
        contentType: 'image/png',
        sizeBytes: 1000,
        nota: 'x',
      }).success,
    ).toBe(false);
  });

  it('exige el peso y lo limita a 2 MB', () => {
    const parse = (body: object) =>
      GetLenderLogoUploadUrlRequestSchema.safeParse({
        contentType: 'image/png',
        ...body,
      }).success;

    expect(parse({})).toBe(false);
    expect(parse({ sizeBytes: 0 })).toBe(false);
    expect(parse({ sizeBytes: 2 * 1024 * 1024 })).toBe(true);
    expect(parse({ sizeBytes: 2 * 1024 * 1024 + 1 })).toBe(false);
    expect(parse({ sizeBytes: 1.5 })).toBe(false);
  });
});
