-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "lender_id" UUID NOT NULL,
    "national_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "occupation" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clients_lender_id_idx" ON "clients"("lender_id");

-- CreateIndex
CREATE UNIQUE INDEX "clients_lender_id_national_id_key" ON "clients"("lender_id", "national_id");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_lender_id_fkey" FOREIGN KEY ("lender_id") REFERENCES "lenders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
