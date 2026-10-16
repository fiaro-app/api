-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('CLIENT_PHOTO', 'PAYMENT_PROOF');

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL,
    "lender_id" UUID NOT NULL,
    "kind" "AttachmentKind" NOT NULL,
    "owner_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attachments_kind_owner_id_key" ON "attachments"("kind", "owner_id");

-- CreateIndex
CREATE INDEX "attachments_lender_id_idx" ON "attachments"("lender_id");

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_lender_id_fkey" FOREIGN KEY ("lender_id") REFERENCES "lenders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
