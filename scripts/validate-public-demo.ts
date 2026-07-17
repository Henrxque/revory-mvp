import assert from "node:assert/strict";
import fs from "node:fs";

import { quoteRecoverySample } from "../services/demo/quote-recovery-sample";

assert.equal(quoteRecoverySample.opportunities.length, 3);
assert(quoteRecoverySample.opportunities.every((item) => item.estimateExternalId.startsWith("EST-SAMPLE-")));
assert(quoteRecoverySample.opportunities.some((item) => item.valueCents === null));
assert(quoteRecoverySample.opportunities.some((item) => item.valueBasis === "Estimated opportunity"));
const page = fs.readFileSync("src/app/demo/page.tsx", "utf8");
assert.match(page, /synthetic sample data/i);
assert.match(page, /nothing on this page is saved/);
assert.match(page, /cannot upload, edit, dismiss, resolve, buy or persist anything/);
assert.doesNotMatch(page, /href="\/(?:start|api\/billing)|type="file"/i);
console.log("Canonical public sample workspace contract: PASS");
