CREATE TABLE "operational_job_states" (
  "key" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'IDLE',
  "leaseToken" TEXT,
  "leaseUntil" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "lastSucceededAt" TIMESTAMP(3),
  "resultJson" JSONB NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "operational_job_states_pkey" PRIMARY KEY ("key")
);
