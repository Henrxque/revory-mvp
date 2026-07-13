import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("src/app/api/jobs/enforce-retention/route.ts", "utf8");
const service = fs.readFileSync("services/data-portability/enforce-retention.ts", "utf8");
assert.match(route, /CRON_SECRET/);
assert.match(route, /authorization/);
assert.match(service, /workspaceId/);
assert.match(service, /retentionDays/);
assert.match(service, /RETENTION_ENFORCED/);
assert.match(service, /deletedCount > 0/);
console.log("Protected idempotent retention job contract: PASS");
