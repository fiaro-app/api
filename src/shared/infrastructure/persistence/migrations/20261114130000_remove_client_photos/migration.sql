-- Quita la foto de los clientes (D-153): se borran sus filas y el tipo deja de existir.
DELETE FROM "attachments" WHERE "kind" = 'CLIENT_PHOTO';

-- AlterEnum
BEGIN;
CREATE TYPE "AttachmentKind_new" AS ENUM ('PAYMENT_PROOF');
ALTER TABLE "attachments" ALTER COLUMN "kind" TYPE "AttachmentKind_new" USING ("kind"::text::"AttachmentKind_new");
ALTER TYPE "AttachmentKind" RENAME TO "AttachmentKind_old";
ALTER TYPE "AttachmentKind_new" RENAME TO "AttachmentKind";
DROP TYPE "AttachmentKind_old";
COMMIT;
