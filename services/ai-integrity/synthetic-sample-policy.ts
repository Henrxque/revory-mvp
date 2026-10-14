import "server-only";

import { createHash } from "node:crypto";
import type { AiIntegritySourceKind } from "@/domain/ai-integrity/contracts";
import type { AiIntakeFile } from "./intake";
import { isAiIntegrityRemoteSyntheticPreviewEnabled } from "./experience";

// SHA-256 of the three public, fictional CSV samples. No other upload is accepted remotely.
const SAMPLE_SHA256: Record<AiIntegritySourceKind, string> = {
  STRIPE_REVENUE: "bdd56034f9003d2707326c13f1bdf0a954900ca57de72b6d548a17af838de51e",
  INTERNAL_LEDGER: "d1d80b5328539e683d98677e24e873bb19c836d8065cdaaa2fccc9e2770e3759",
  PROVIDER_REPORT: "f64e1946be42dff79ec40ca711bbab6f538bec6cf6b5cf8a9b9ecc9b84d20756",
};

export function assertAiSyntheticPreviewSample(file: AiIntakeFile, sourceKind: AiIntegritySourceKind) {
  if (!isAiIntegrityRemoteSyntheticPreviewEnabled()) return;
  const digest = createHash("sha256").update(file.bytes).digest("hex");
  if (digest !== SAMPLE_SHA256[sourceKind]) {
    throw new Error("This protected preview accepts only the three bundled synthetic CSV samples. Do not upload customer data.");
  }
}
