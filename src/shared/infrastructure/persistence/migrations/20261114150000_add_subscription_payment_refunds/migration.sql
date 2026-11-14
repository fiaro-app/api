-- Reembolsos de los pagos del plan (D-156): un estado nuevo y los datos de la devolución.
ALTER TYPE "SubscriptionPaymentStatus" ADD VALUE 'REFUNDED';

ALTER TABLE "subscription_payments"
  ADD COLUMN "refunded_at" TIMESTAMPTZ(3),
  ADD COLUMN "refunded_by_user_id" UUID,
  ADD COLUMN "refund_mode" TEXT,
  ADD COLUMN "refund_reference" TEXT,
  ADD COLUMN "refund_reason" TEXT;
