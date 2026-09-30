-- CreateTable
CREATE TABLE "portfolios" (
    "id" UUID NOT NULL,
    "lender_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "portfolios_lender_id_idx" ON "portfolios"("lender_id");

-- CreateIndex
CREATE UNIQUE INDEX "portfolios_lender_id_name_key" ON "portfolios"("lender_id", "name");

-- AddForeignKey
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_lender_id_fkey" FOREIGN KEY ("lender_id") REFERENCES "lenders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
