import assert from "node:assert/strict";
import fs from "node:fs";

import { quoteRecoverySample, sampleMoney } from "../services/demo/quote-recovery-sample";

assert.equal(quoteRecoverySample.opportunities.length, 3);
assert(quoteRecoverySample.opportunities.every((item) => item.estimateExternalId.startsWith("EST-SAMPLE-")));
assert(quoteRecoverySample.opportunities.some((item) => item.valueCents === null));
assert(quoteRecoverySample.opportunities.some((item) => item.valueBasis === "Estimated opportunity"));
const operationalOpportunity = quoteRecoverySample.opportunities.find((item) => item.valueCents === null);
assert.equal(operationalOpportunity?.valueBasis, "Operational risk");
const page = fs.readFileSync("src/app/demo/page.tsx", "utf8");
assert.match(page, /synthetic sample data/i);
assert.match(page, /nothing on this page is saved/);
assert.match(page, /cannot upload, edit, dismiss, resolve, buy or persist anything/);
assert.doesNotMatch(page, /href="\/(?:start|api\/billing)|type="file"/i);
assert.doesNotMatch(`${page}\n${sampleMoney(null)}`, /Operational operational risk/i);
assert.equal(sampleMoney(null), "Operational risk");
assert.equal(
  quoteRecoverySample.opportunities
    .filter((item) => item.valueCents !== null)
    .reduce((sum, item) => sum + item.valueCents, 0),
  7_440_000,
  "Operational findings must not contribute to the financial opportunity total.",
);
console.log("Canonical public sample workspace contract: PASS");
