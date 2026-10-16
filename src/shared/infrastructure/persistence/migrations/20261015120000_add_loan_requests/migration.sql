-- CreateEnum
CREATE TYPE "LoanRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "loan_requests" (
    "id" UUID NOT NULL,
    "lender_id" UUID NOT NULL,
    "requested_by_membership_id" UUID NOT NULL,
    "client_id" UUID,
    "national_id" TEXT NOT NULL,
    "client_full_name" TEXT,
    "client_occupation" TEXT,
    "client_phone" TEXT,
    "client_address" TEXT,
    "principal_amount" INTEGER NOT NULL,
    "installment_count" INTEGER NOT NULL,
    "installment_value" INTEGER NOT NULL,
    "total_payable" INTEGER NOT NULL,
    "frequency" "LoanFrequency" NOT NULL,
    "start_date" TEXT NOT NULL,
    "status" "LoanRequestStatus" NOT NULL DEFAULT 'PENDING',
    "resolved_by_membership_id" UUID,
    "resolved_at" TIMESTAMPTZ(3),
    "rejection_reason" TEXT,
    "loan_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "loan_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "loan_requests_lender_id_status_created_at_idx" ON "loan_requests"("lender_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "loan_requests_requested_by_membership_id_idx" ON "loan_requests"("requested_by_membership_id");

-- AddForeignKey
ALTER TABLE "loan_requests" ADD CONSTRAINT "loan_requests_lender_id_fkey" FOREIGN KEY ("lender_id") REFERENCES "lenders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
