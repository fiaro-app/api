/**
 * Deja el bucket de desarrollo con lectura pública (D-102): sin esto, la URL pública de un logo
 * recién subido responde 403 — un bucket S3 nuevo (SeaweedFS incluido) nace privado. Cloudflare
 * R2 en producción no lo necesita: su "Public Development URL" o un dominio propio lo resuelven
 * aparte, sin pasar por esta misma llamada (ARCHITECTURE.md, "Almacenamiento S3"). Es idempotente:
 * volver a aplicar la misma política no cambia nada.
 *
 * Necesita las variables de entorno de la API (`.env`). Solo para desarrollo.
 */
import { existsSync } from 'node:fs';
import { PutBucketPolicyCommand, S3Client } from '@aws-sdk/client-s3';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}
if (process.env.NODE_ENV === 'production') {
  throw new Error(
    'El seed es solo para desarrollo: no se ejecuta en producción.',
  );
}

const bucket = process.env.S3_BUCKET ?? 'fiaro-dev';
const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:8333',
  region: process.env.S3_REGION ?? 'auto',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? 'fiaro',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? 'fiaro-secret',
  },
});

const policy = {
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'PublicRead',
      Effect: 'Allow',
      Principal: '*',
      Action: ['s3:GetObject'],
      Resource: [`arn:aws:s3:::${bucket}/*`],
    },
  ],
};

await client.send(
  new PutBucketPolicyCommand({
    Bucket: bucket,
    Policy: JSON.stringify(policy),
  }),
);
console.log(`bucket ${bucket}: lectura pública activada`);
