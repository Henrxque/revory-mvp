import assert from "node:assert/strict";

import { PrismaClient } from "@prisma/client";
import { assertIsolatedRestore, readRestoreManifest, compareRestoreManifests } from "./lib/restore-manifest.mjs";

const requiredAcknowledgement = "READ_ONLY_ISOLATED_RESTORE";
assert.equal(
  process.env.REVORY_RESTORE_CHECK_ACK,
  requiredAcknowledgement,
  `Set REVORY_RESTORE_CHECK_ACK=${requiredAcknowledgement} only after creating an isolated provider restore.`,
);

const sourceUrl = process.env.REVORY_RESTORE_SOURCE_DATABASE_URL?.trim();
const restoreUrl = process.env.REVORY_RESTORE_TARGET_DATABASE_URL?.trim();
assert.ok(sourceUrl, "REVORY_RESTORE_SOURCE_DATABASE_URL is required.");
assert.ok(restoreUrl, "REVORY_RESTORE_TARGET_DATABASE_URL is required.");

assertIsolatedRestore(sourceUrl, restoreUrl);

function requiredTimestamp(name) {
  const value = process.env[name]?.trim();
  assert.ok(value && !Number.isNaN(Date.parse(value)), `${name} must be a valid ISO timestamp.`);
  return new Date(value);
}

const backupCapturedAt = requiredTimestamp("REVORY_BACKUP_CAPTURED_AT");
const restoreStartedAt = requiredTimestamp("REVORY_RESTORE_STARTED_AT");
const restoreCompletedAt = requiredTimestamp("REVORY_RESTORE_COMPLETED_AT");
assert.ok(restoreStartedAt >= backupCapturedAt, "Restore start cannot predate the backup.");
assert.ok(restoreCompletedAt >= restoreStartedAt, "Restore completion cannot predate its start.");

const source = new PrismaClient({ datasourceUrl: sourceUrl, log: [] });
const restore = new PrismaClient({ datasourceUrl: restoreUrl, log: [] });

try {
  await Promise.all([source.$connect(), restore.$connect()]);
  const [sourceManifest, targetManifest] = await Promise.all([readRestoreManifest(source), readRestoreManifest(restore)]);
  const result = compareRestoreManifests(sourceManifest, targetManifest);
  console.log(JSON.stringify({ ...result, status: "PASS", readOnly: true,
    measuredRpoMinutes: Math.round((restoreStartedAt-backupCapturedAt)/60000),
    measuredRtoMinutes: Math.round((restoreCompletedAt-restoreStartedAt)/60000),
    timingBasis: "Operator-provided timestamps; snapshot age and restore duration, not a guaranteed production RPO/RTO.",
  }, null, 2));
} catch {
  console.error("Restore verification FAILED: no recovery claim. Check source/target schema, constraints and content in the private operations record.");
  process.exitCode = 1;
} finally { await Promise.allSettled([source.$disconnect(), restore.$disconnect()]); }
