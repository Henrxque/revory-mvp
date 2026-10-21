CREATE TABLE "ai_integrity_source_credentials" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "keyVersion" TEXT NOT NULL,
  "iv" TEXT NOT NULL,
  "authTag" TEXT NOT NULL,
  "ciphertext" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_integrity_source_credentials_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_source_credential_connection_fkey" FOREIGN KEY ("workspaceId", "connectionId") REFERENCES "ai_integrity_source_connections"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ai_source_credential_envelope_check" CHECK (length("keyVersion") BETWEEN 1 AND 40 AND length("iv") = 16 AND length("authTag") = 24 AND length("ciphertext") BETWEEN 24 AND 1024)
);
CREATE UNIQUE INDEX "ai_integrity_source_credentials_connectionId_key" ON "ai_integrity_source_credentials"("connectionId");
CREATE UNIQUE INDEX "ai_source_credential_workspace_connection_key" ON "ai_integrity_source_credentials"("workspaceId", "connectionId");
CREATE INDEX "ai_source_credential_workspace_idx" ON "ai_integrity_source_credentials"("workspaceId");

ALTER TABLE "ai_integrity_source_connections" DROP CONSTRAINT "ai_source_mode_check";
ALTER TABLE "ai_integrity_source_connections" ADD CONSTRAINT "ai_source_mode_check" CHECK (
  "generation" > 0 AND (
    ("mode" = 'SYNTHETIC_REHEARSAL' AND "provider" IN ('STRIPE', 'OPENAI')) OR
    ("mode" IN ('CONTROLLED_OPENAI_READ', 'CUSTOMER_API_PREVIEW') AND
     (("mode" = 'CONTROLLED_OPENAI_READ' AND "provider" = 'OPENAI') OR ("mode" = 'CUSTOMER_API_PREVIEW' AND "provider" IN ('STRIPE', 'OPENAI'))) AND
     "organizationId" IS NOT NULL AND "projectScope" = 'ALL_PROJECTS' AND
     "consentPurpose" IS NOT NULL AND "consentStart" IS NOT NULL AND "consentEnd" IS NOT NULL AND "consentStart" < "consentEnd")
  )
);
