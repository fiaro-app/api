-- CreateEnum
CREATE TYPE "LoanFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'PAID_OFF', 'CANCELED');

-- CreateTable
CREATE TABLE "loans" (
    "id" UUID NOT NULL,
    "lender_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "principal_amount" INTEGER NOT NULL,
    "installment_count" INTEGER NOT NULL,
    "installment_value" INTEGER NOT NULL,
    "total_payable" INTEGER NOT NULL,
    "frequency" "LoanFrequency" NOT NULL,
    "start_date" TEXT NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_membership_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "closed_at" TIMESTAMPTZ(3),

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "loans_lender_id_idx" ON "loans"("lender_id");

-- CreateIndex
CREATE INDEX "loans_client_id_idx" ON "loans"("client_id");

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_lender_id_fkey" FOREIGN KEY ("lender_id") REFERENCES "lenders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
