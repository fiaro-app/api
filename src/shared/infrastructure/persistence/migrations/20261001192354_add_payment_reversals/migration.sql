-- CreateTable
CREATE TABLE "payment_reversals" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "reversed_by_membership_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_reversals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_reversals_payment_id_key" ON "payment_reversals"("payment_id");

-- AddForeignKey
ALTER TABLE "payment_reversals" ADD CONSTRAINT "payment_reversals_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
