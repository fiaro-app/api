import { describe, expect, it } from 'vitest';
import { GetLenderLogoUploadUrlRequestSchema } from '@/modules/lenders/infrastructure/controllers/schemas/lender-logo-requests.schema.js';

describe('GetLenderLogoUploadUrlRequestSchema', () => {
  it.each(['image/png', 'image/jpeg'])(
    'acepta contentType %s',
    (contentType) => {
      expect(
        GetLenderLogoUploadUrlRequestSchema.safeParse({ contentType }).success,
      ).toBe(true);
    },
  );

  it('rechaza un contentType que no sea imagen PNG o JPEG', () => {
    expect(
      GetLenderLogoUploadUrlRequestSchema.safeParse({
        contentType: 'application/pdf',
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
        nota: 'x',
      }).success,
    ).toBe(false);
  });
});
