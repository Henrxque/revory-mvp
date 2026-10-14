import "server-only";

import { createHash } from "node:crypto";
import type { AiIntegritySourceKind } from "@/domain/ai-integrity/contracts";
import type { AiIntakeFile } from "./intake";
import { isAiIntegrityRemoteSyntheticPreviewEnabled } from "./experience";

// SHA-256 of the three public fictional CSVs with LF newlines. Git/Vercel use
// LF while Windows downloads/checkouts may use CRLF. Only newline spelling is
// normalized; every other byte of the sample content must still match.
const SAMPLE_SHA256: Record<AiIntegritySourceKind, string> = {
  STRIPE_REVENUE: "0595b018ff410106a6055de68f1df9d2fd817b4214a63fc777d1467067d986af",
  INTERNAL_LEDGER: "f6a138b3248ceb3bd0be4bd8cc9bdd9f06e8f5a33bcfad5a18957f69ead60e34",
  PROVIDER_REPORT: "88c6e882a7c22fc52fa78a3256b3e86bc75b56bd4d52fb35d531eac6461e1625",
};

export function assertAiSyntheticPreviewSample(file: AiIntakeFile, sourceKind: AiIntegritySourceKind) {
  if (!isAiIntegrityRemoteSyntheticPreviewEnabled()) return;
  const canonical = Buffer.from(file.bytes).toString("utf8").replaceAll("\r\n", "\n");
  const digest = createHash("sha256").update(canonical).digest("hex");
  if (digest !== SAMPLE_SHA256[sourceKind]) {
    throw new Error("This protected preview accepts only the three bundled synthetic CSV samples. Do not upload customer data.");
  }
}
