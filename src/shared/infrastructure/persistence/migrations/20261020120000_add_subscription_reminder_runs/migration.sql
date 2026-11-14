-- CreateTable
CREATE TABLE "subscription_reminder_runs" (
    "business_date" DATE NOT NULL,
    "claimed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(3),
    "reminders_sent" INTEGER,

    CONSTRAINT "subscription_reminder_runs_pkey" PRIMARY KEY ("business_date")
);
