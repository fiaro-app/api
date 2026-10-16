-- AlterTable
-- Los negocios que ya existen están en prueba: reciben los topes de la prueba (3 administradores,
-- 4 carteras —el tope fijo que ya regía, D-141— y préstamos sin tope), para que ninguno cambie.
ALTER TABLE "subscriptions"
    ADD COLUMN "max_admins" INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN "max_portfolios" INTEGER NOT NULL DEFAULT 4,
    ADD COLUMN "max_active_loans" INTEGER;

ALTER TABLE "subscriptions"
    ALTER COLUMN "max_admins" DROP DEFAULT,
    ALTER COLUMN "max_portfolios" DROP DEFAULT;
