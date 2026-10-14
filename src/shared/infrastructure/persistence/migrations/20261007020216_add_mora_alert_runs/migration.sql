-- CreateTable
CREATE TABLE "mora_alert_runs" (
    "business_date" DATE NOT NULL,
    "claimed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(3),
    "lenders_notified" INTEGER,
    "loans_in_mora" INTEGER,

    CONSTRAINT "mora_alert_runs_pkey" PRIMARY KEY ("business_date")
);
