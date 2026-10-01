-- CreateTable
CREATE TABLE "collection_assignments" (
    "id" UUID NOT NULL,
    "loan_id" UUID NOT NULL,
    "collector_membership_id" UUID NOT NULL,
    "effective_from" TEXT NOT NULL,
    "effective_to" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "collection_assignments_loan_id_idx" ON "collection_assignments"("loan_id");

-- CreateIndex
CREATE INDEX "collection_assignments_collector_membership_id_idx" ON "collection_assignments"("collector_membership_id");

-- AddForeignKey
ALTER TABLE "collection_assignments" ADD CONSTRAINT "collection_assignments_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_assignments" ADD CONSTRAINT "collection_assignments_collector_membership_id_fkey" FOREIGN KEY ("collector_membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
