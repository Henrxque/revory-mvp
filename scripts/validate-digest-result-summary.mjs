import assert from "node:assert/strict";
import { summarizeDigestResults } from "../services/email/digest-result-summary.ts";

assert.deepEqual(summarizeDigestResults([]), { sent: 0, skipped: 0, failed: 0 });
assert.deepEqual(summarizeDigestResults([
  { sent: true },
  { sent: false, reason: "GROWTH_ENTITLEMENT_REQUIRED" },
  { sent: false, reason: "DIGEST_DISABLED" },
  { sent: false, reason: "EMAIL_NOT_CONFIGURED" },
  { sent: false, reason: "PROVIDER_ERROR" },
  { sent: false },
]), { sent: 1, skipped: 2, failed: 3 });
console.log("Digest outcomes: ineligible recipients skipped; configuration/provider errors remain failures: PASS");
