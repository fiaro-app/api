-- CreateEnum
CREATE TYPE "VisitOutcome" AS ENUM ('PAID', 'NOT_FOUND', 'REFUSED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'NEQUI', 'TRANSFER');

-- CreateTable
CREATE TABLE "collection_visits" (
    "id" UUID NOT NULL,
    "loan_id" UUID NOT NULL,
    "collector_membership_id" UUID NOT NULL,
    "outcome" "VisitOutcome" NOT NULL,
    "expected_amount" INTEGER NOT NULL,
    "promised_date" TEXT,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "loan_id" UUID NOT NULL,
    "visit_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "collection_visits_loan_id_idx" ON "collection_visits"("loan_id");

-- CreateIndex
CREATE INDEX "collection_visits_collector_membership_id_idx" ON "collection_visits"("collector_membership_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_visit_id_key" ON "payments"("visit_id");

-- CreateIndex
CREATE INDEX "payments_loan_id_idx" ON "payments"("loan_id");

-- AddForeignKey
ALTER TABLE "collection_visits" ADD CONSTRAINT "collection_visits_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_visits" ADD CONSTRAINT "collection_visits_collector_membership_id_fkey" FOREIGN KEY ("collector_membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "collection_visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
