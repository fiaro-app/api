-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "plan_code" TEXT NOT NULL,
    "max_active_lenders" INTEGER NOT NULL,
    "max_collectors" INTEGER NOT NULL,
    "current_period_ends_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_tenant_id_key" ON "subscriptions"("tenant_id");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Los negocios que ya existían reciben una prueba de 30 días desde esta migración. Los límites son
-- los iniciales (1 prestamista, 5 cobradores) o lo que el negocio ya tiene si es más, para que
-- ninguno aparezca por encima de su propio límite.
INSERT INTO "subscriptions" ("id", "tenant_id", "plan_code", "max_active_lenders", "max_collectors", "current_period_ends_at")
SELECT
    gen_random_uuid(),
    t."id",
    'TRIAL',
    GREATEST(1, (SELECT COUNT(*) FROM "lenders" l WHERE l."tenant_id" = t."id")),
    GREATEST(5, (
        SELECT COUNT(*)
        FROM "memberships" m
        JOIN "lenders" l ON l."id" = m."lender_id"
        WHERE l."tenant_id" = t."id" AND m."status" = 'ACTIVE' AND 'COLLECTOR'::"Role" = ANY (m."roles")
    )),
    CURRENT_TIMESTAMP + INTERVAL '30 days'
FROM "tenants" t;
