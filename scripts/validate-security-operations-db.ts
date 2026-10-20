import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { verifyRuntimeRole } from "./validate-runtime-role.mjs";
import { prisma } from "../db/prisma";
import { enforceWorkspaceRetention } from "../services/data-portability/enforce-retention";
import { readRestoreManifest, compareRestoreManifests, assertIsolatedRestore } from "./lib/restore-manifest.mjs";
import { evaluateEntries } from "./observe-sprint-16-crons.mjs";
import { runRetentionJob } from "../services/data-portability/retention-job";
import { GET } from "../src/app/api/jobs/enforce-retention/route";
import { rewrapSourceCredentials } from "../services/ai-integrity/rotate-credentials";
import { openSourceCredential, sealSourceCredential } from "../services/ai-integrity/credential-vault";

if (!/^\/revory_sprint1_[a-f0-9]{12}$/.test(new URL(process.env.DATABASE_URL ?? "").pathname)) throw new Error("Disposable local database required.");
try {
  const user = await prisma.user.create({ data: { email: randomUUID() + "@example.invalid" } });
  for (let i = 0; i < 3; i++) await prisma.workspace.create({ data: { id: "security-ws-" + i, name: "Synthetic security proof", slug: randomUUID(), ownerUserId: user.id } });
  let calls = 0;
  const enforce = async (id: string) => {
    calls++;
    const nested = await runRetentionJob(); assert.equal(nested.status, "BUSY", "Concurrent dispatcher cannot acquire the lease.");
    if (id === "security-ws-1") throw new Error("fixture secret that must never enter the operational checkpoint");
    return { deletedFindings: 0, deletedImportSessions: 0, deletedRuns: 0 } as Awaited<ReturnType<typeof import("../services/data-portability/enforce-retention").enforceWorkspaceRetention>>;
  };
  const partial = await runRetentionJob({ maxWorkspaces: 1, enforce });
  assert.equal(partial.status, "PARTIAL"); assert.equal(partial.workspaces, 1);
  assert.equal((await prisma.operationalJobState.findUniqueOrThrow({ where: { key: "RETENTION" } })).lastSucceededAt, null);
  const failed = await runRetentionJob({ enforce });
  assert.equal(failed.status, "FAILED"); assert.equal(failed.workspaces, 3); assert.equal(failed.failedWorkspaces, 1); assert.equal(calls, 3);
  let row = await prisma.operationalJobState.findUniqueOrThrow({ where: { key: "RETENTION" } });
  assert.ok(!JSON.stringify(row).includes("fixture secret")); assert.equal(row.lastSucceededAt, null);
  const success = await runRetentionJob(); assert.equal(success.status, "SUCCEEDED");
  row = await prisma.operationalJobState.findUniqueOrThrow({ where: { key: "RETENTION" } });
  assert.ok(row.lastSucceededAt); assert.equal(row.leaseToken, null); assert.equal(success.workspaces, 3);
  await prisma.operationalJobState.update({ where: { key: "RETENTION" }, data: { status: "RUNNING", leaseToken: "expired-fixture", leaseUntil: new Date(0) } });
  assert.equal((await runRetentionJob()).status, "SUCCEEDED", "A crashed worker's expired lease can be reclaimed.");
  delete process.env.CRON_SECRET;
  assert.equal((await GET(new Request("http://localhost/api/jobs/enforce-retention"))).status, 503);
  process.env.CRON_SECRET = randomBytes(32).toString("hex");
  assert.equal((await GET(new Request("http://localhost/api/jobs/enforce-retention"))).status, 401);
  const request = () => new Request("http://localhost/api/jobs/enforce-retention", { headers: { authorization: "Bearer " + process.env.CRON_SECRET } });
  assert.equal((await GET(request())).status, 200);
  await prisma.operationalJobState.update({ where: { key: "RETENTION" }, data: { leaseToken: "active-fixture", leaseUntil: new Date(Date.now() + 60_000) } });
  assert.equal((await GET(request())).status, 409);
  await prisma.operationalJobState.update({ where: { key: "RETENTION" }, data: { leaseToken: null, leaseUntil: null, status: "IDLE" } });

  await prisma.workspaceDataSettings.update({ where: { workspaceId: "security-ws-0" }, data: { retentionDays: 2147483647 } });
  assert.equal((await GET(request())).status, 503, "A workspace retention failure must not return HTTP 200.");
  await prisma.workspaceDataSettings.update({ where: { workspaceId: "security-ws-0" }, data: { retentionDays: 365 } });
  assert.equal((await GET(request())).status, 200);

  const expiredSnapshot = await prisma.aiIntegritySnapshot.create({ data: {
    workspaceId: "security-ws-0", idempotencyKey: randomUUID(), ruleVersion: "fixture-only",
    windowStart: new Date("2020-01-01"), windowEnd: new Date("2020-01-02"), createdAt: new Date("2020-01-03"),
    inputManifestJson: {}, dataQualityJson: {}, coverageJson: {}, suppressionsJson: [],
  } });
  const dangling = await prisma.aiIntegrityMonitorState.create({ data: { workspaceId: "security-ws-0", kind: "INVESTIGATION", key: "recent-edit-old-evidence", status: "OPEN", dataJson: { snapshotId: expiredSnapshot.id } } });
  const retired = await enforceWorkspaceRetention("security-ws-0");
  assert.equal(retired.deletedAiMonitorStates, 1);
  assert.equal(await prisma.aiIntegrityMonitorState.count({ where: { id: dangling.id } }), 0, "Recent edits cannot preserve a link to expired evidence.");
  for (const status of ["PARTIAL", "BUSY", "FAILED"]) assert.equal(evaluateEntries({ job: "retention", marker: "retention_job_complete", window: "fixture", entries: [{ timestamp: new Date().toISOString(), message: "retention_job_complete", status, failedWorkspaces: 0 }] }).passed, false);
  assert.throws(() => assertIsolatedRestore("postgresql://x:fixture@ep-test.example/db", "postgresql://x:fixture@ep-test-pooler.example/db"), /distinct endpoint/);
  const manifest = await readRestoreManifest(prisma);
  assert.equal(compareRestoreManifests(manifest, structuredClone(manifest)).contentHashesMatch, true);
  const changed = structuredClone(manifest); changed.rows[0].digest = "altered-fixture";
  assert.throws(() => compareRestoreManifests(manifest, changed), /content differ/);
  await assert.rejects(() => prisma.$transaction(async tx => { await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY"); await tx.$executeRawUnsafe("CREATE TABLE forbidden_restore_write(id text)"); }));

  const firstKey = randomBytes(32).toString("base64");
  process.env.REVORY_AI_CONNECTION_ACTIVE_KEY = "v1";
  process.env.REVORY_AI_CONNECTION_KEYRING = JSON.stringify({ v1: firstKey });
  const connection = await prisma.aiIntegritySourceConnection.create({ data: { workspaceId: "security-ws-0", provider: "OPENAI", mode: "CUSTOMER_API_PREVIEW", consentVersion: "fixture", consentedBy: user.id, organizationId: "org-fixture", projectScope: "ALL_PROJECTS", consentPurpose: "Fixture only", consentStart: new Date("2026-10-01T00:00:00Z"), consentEnd: new Date("2026-10-02T00:00:00Z") } });
  const scope = { workspaceId: connection.workspaceId, connectionId: connection.id, generation: 1, provider: "OPENAI" as const };
  const secret = "fixture-" + randomBytes(24).toString("hex");
  const original = await prisma.aiIntegritySourceCredential.create({ data: { workspaceId: connection.workspaceId, connectionId: connection.id, ...sealSourceCredential(secret, scope) } });
  process.env.REVORY_AI_CONNECTION_ACTIVE_KEY = "v2";
  process.env.REVORY_AI_CONNECTION_KEYRING = JSON.stringify({ v1: firstKey, v2: randomBytes(32).toString("base64") });
  const dry = await rewrapSourceCredentials(); assert.equal(dry.checked, 1); assert.equal(dry.rotated, 0);
  assert.equal((await prisma.aiIntegritySourceCredential.findUniqueOrThrow({ where: { id: original.id } })).keyVersion, "v1");
  const rotated = await rewrapSourceCredentials({ apply: true }); assert.equal(rotated.rotated, 1); assert.equal(rotated.remaining, 0);
  const current = await prisma.aiIntegritySourceCredential.findUniqueOrThrow({ where: { id: original.id } });
  assert.equal(current.keyVersion, "v2"); assert.equal(openSourceCredential(current, scope), secret);
  assert.ok(!JSON.stringify(rotated).includes(secret)); assert.equal((await rewrapSourceCredentials({ apply: true })).rotated, 0);
  process.env.REVORY_AI_CONNECTION_ACTIVE_KEY = "v3";
  process.env.REVORY_AI_CONNECTION_KEYRING = JSON.stringify({ v3: randomBytes(32).toString("base64") });
  await assert.rejects(() => rewrapSourceCredentials({ apply: true }), /could not be opened/);
  assert.deepEqual(await prisma.aiIntegritySourceCredential.findUniqueOrThrow({ where: { id: current.id } }), current, "Missing old key fails without modifying the envelope.");
  const runtimeRole = await verifyRuntimeRole(process.env.DATABASE_URL!);
  await mkdir("docs/qa/security-operations", { recursive: true });
  await writeFile("docs/qa/security-operations/local-proof.json", JSON.stringify({ verifiedAt: new Date().toISOString(), fixtureOnly: true,
    retention: { durableZeroDeletionSuccess: true, failedWorkspaceDoesNotPass: true, checkpointResume: true, concurrentLease: true, expiredLeaseRecovery: true, endpointAuthentication: true },
    credentials: { dryRunWithoutMutation: true, rewrapPreservesSecretAndScope: true, idempotent: true, missingOldKeyFailsClosed: true },
    runtimeRole,
    recoveryVerification: { readOnlyEnforced: true, pooledEndpointAliasRejected: true, contentDriftFailsClosed: true },
    productionDeletionExecuted: false, externalCredentialsChanged: false }, null, 2) + "\n");
  console.log("PASS: durable retention, failure state, bounded resume, leases/auth and encrypted credential rewrap.");
} finally { await prisma.$disconnect(); }
