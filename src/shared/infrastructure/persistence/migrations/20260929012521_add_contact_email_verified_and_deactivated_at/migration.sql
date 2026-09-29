-- AlterTable
ALTER TABLE "users" ADD COLUMN     "contact_email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deactivated_at" TIMESTAMPTZ(3);
