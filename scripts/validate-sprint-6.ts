import assert from "node:assert/strict";
import fs from "node:fs";

import { classifyQuoteRecoveryMovement } from "../domain/revory/movement";

const before = [
  { fingerprint: "persistent", severity: "MEDIUM", valueCents: 1000 },
  { fingerprint: "resolved", severity: "HIGH", valueCents: 5000 },
  { fingerprint: "worse", severity: "MEDIUM", valueCents: 2000 },
];
const after = [
  { fingerprint: "persistent", severity: "MEDIUM", valueCents: 1000 },
  { fingerprint: "new", severity: "LOW", valueCents: null },
  { fingerprint: "worse", severity: "HIGH", valueCents: 3000 },
];

assert.deepEqual(classifyQuoteRecoveryMovement(after, before), {
  newCount: 1,
  persistentCount: 2,
  worseningCount: 1,
  resolvedCount: 1,
});

const files = {
  settings: fs.readFileSync("src/app/(app)/app/settings/actions.ts", "utf8"),
  exportRoute: fs.readFileSync(
    "src/app/(app)/app/settings/data-export/route.ts",
    "utf8",
  ),
  digest: fs.readFileSync("src/app/api/jobs/weekly-digest/route.ts", "utf8"),
  dispositions: fs.readFileSync(
    "src/app/(app)/app/revenue-leaks/actions.ts",
    "utf8",
  ),
  billing: fs.readFileSync("services/billing/revory-offers.ts", "utf8"),
};

assert.match(files.settings, /getAppContext/);
assert.match(files.settings, /workspaceId/);
assert.match(files.settings, /DELETE REVORY DATA/);
assert.match(files.exportRoute, /getAppContext/);
assert.match(files.exportRoute, /private, no-store/);
assert.match(files.digest, /CRON_SECRET/);
assert.match(files.digest, /authorization/);
assert.match(files.dispositions, /RECOVERED/);
assert.match(files.dispositions, /recoveredValueCents/);
assert.match(files.billing, /STRIPE_STARTER_PRICE_ID/);
assert.doesNotMatch(files.billing, /STRIPE_GROWTH_PRICE_ID/);
console.log("Sprint 6 local recurring loop and security contracts: PASS");
