-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'LENDER', 'COLLECTOR');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "lender_id" UUID NOT NULL,
    "roles" "Role"[],
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "portfolio_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deactivated_at" TIMESTAMPTZ(3),

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "memberships_lender_id_idx" ON "memberships"("lender_id");

-- CreateIndex
CREATE INDEX "memberships_portfolio_id_idx" ON "memberships"("portfolio_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_user_id_lender_id_key" ON "memberships"("user_id", "lender_id");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_lender_id_fkey" FOREIGN KEY ("lender_id") REFERENCES "lenders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
