CREATE TABLE "legal_acceptances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "event" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "documentVersionsJson" JSONB NOT NULL,
    "contextJson" JSONB NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_acceptances_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "legal_acceptances_userId_event_acceptedAt_idx"
ON "legal_acceptances"("userId", "event", "acceptedAt");

CREATE INDEX "legal_acceptances_workspaceId_event_acceptedAt_idx"
ON "legal_acceptances"("workspaceId", "event", "acceptedAt");

ALTER TABLE "legal_acceptances"
ADD CONSTRAINT "legal_acceptances_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "legal_acceptances"
ADD CONSTRAINT "legal_acceptances_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
