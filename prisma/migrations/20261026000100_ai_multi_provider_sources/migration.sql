-- Expand supported source/credential contracts without rewriting historical rows.
ALTER TABLE "ai_integrity_source_connections" DROP CONSTRAINT "ai_source_mode_check";
ALTER TABLE "ai_integrity_source_connections" ADD CONSTRAINT "ai_source_mode_check" CHECK (
  "generation" > 0 AND (
    ("mode" = 'SYNTHETIC_REHEARSAL' AND "provider" IN ('STRIPE', 'OPENAI')) OR
    ("mode" IN ('CONTROLLED_OPENAI_READ', 'CUSTOMER_API_PREVIEW') AND
     (("mode" = 'CONTROLLED_OPENAI_READ' AND "provider" = 'OPENAI') OR
      ("mode" = 'CUSTOMER_API_PREVIEW' AND "provider" IN ('STRIPE', 'OPENAI', 'ANTHROPIC', 'GEMINI'))) AND
     "organizationId" IS NOT NULL AND "projectScope" = 'ALL_PROJECTS' AND
     "consentPurpose" IS NOT NULL AND "consentStart" IS NOT NULL AND "consentEnd" IS NOT NULL AND "consentStart" < "consentEnd")
  )
);
ALTER TABLE "ai_integrity_source_credentials" DROP CONSTRAINT "ai_source_credential_envelope_check";
ALTER TABLE "ai_integrity_source_credentials" ADD CONSTRAINT "ai_source_credential_envelope_check" CHECK (
  length("keyVersion") BETWEEN 1 AND 40 AND length("iv") = 16 AND length("authTag") = 24 AND length("ciphertext") BETWEEN 24 AND 24000
);
