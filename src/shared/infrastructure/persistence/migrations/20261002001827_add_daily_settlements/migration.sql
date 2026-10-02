-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "daily_settlements" (
    "id" UUID NOT NULL,
    "collector_membership_id" UUID NOT NULL,
    "date" TEXT NOT NULL,
    "expected_amount" INTEGER NOT NULL,
    "collected_amount" INTEGER NOT NULL,
    "collected_cash" INTEGER NOT NULL,
    "collected_nequi" INTEGER NOT NULL,
    "collected_transfer" INTEGER NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "collector_note" TEXT,
    "review_note" TEXT,
    "reviewed_by_membership_id" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "submitted_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_settlements_collector_membership_id_idx" ON "daily_settlements"("collector_membership_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_settlements_collector_membership_id_date_key" ON "daily_settlements"("collector_membership_id", "date");

-- AddForeignKey
ALTER TABLE "daily_settlements" ADD CONSTRAINT "daily_settlements_collector_membership_id_fkey" FOREIGN KEY ("collector_membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_settlements" ADD CONSTRAINT "daily_settlements_reviewed_by_membership_id_fkey" FOREIGN KEY ("reviewed_by_membership_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
