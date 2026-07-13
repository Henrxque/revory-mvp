import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import JSZip from "jszip";

import { prisma } from "../db/prisma";
import type { CanonicalRecordContract } from "../domain/revory/contracts";
import { assertCanonicalFileContent } from "../services/canonical-intake/file-security";
import { persistSecureIntakePlan } from "../services/canonical-intake/persist-intake";
import { buildSecureIntakePlan } from "../services/canonical-intake/secure-intake";
import type { IntakePlan } from "../services/canonical-intake/secure-intake";
import { createQuoteRecoveryAnalysisRun } from "../services/quote-recovery/analysis-runs";

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
const auth = fs.readFileSync("auth.ts", "utf8");
const webhook = fs.readFileSync("src/app/api/billing/webhook/route.ts", "utf8");
const capabilities = fs.readFileSync("services/billing/capabilities.ts", "utf8");
const offers = fs.readFileSync("services/billing/revory-offers.ts", "utf8");
const analysisRuns = fs.readFileSync("services/quote-recovery/analysis-runs.ts", "utf8");
const entitlements = fs.readFileSync("services/billing/entitlements.ts", "utf8");
const persistIntake = fs.readFileSync("services/canonical-intake/persist-intake.ts", "utf8");
const importAction = fs.readFileSync("src/app/(app)/app/imports/canonical-actions.ts", "utf8");
const boundedFormData = fs.readFileSync("services/security/bounded-form-data.ts", "utf8");
const checkout = fs.readFileSync("src/app/api/billing/checkout/route.ts", "utf8");
assert.match(schema, /enum RevoryOfferKey[\s\S]*PRO/);
assert.match(schema, /sessionVersion\s+Int/);
assert.match(schema, /model StripeWebhookEvent/);
assert.match(schema, /model AuthRateLimitBucket/);
assert.match(schema, /stripeSubscriptionId\s+String\?\s+@unique/);
assert.match(schema, /importSessionId\s+String\?\s+@unique/);
assert.match(schema, /quoteRecoverySnapshotJson\s+Json\?/);
assert.match(schema, /quoteRecoveryDataQualitySnapshotJson\s+Json\?/);
assert.match(auth, /AUTH_SECRET is required outside local development/);
assert.match(auth, /checkDurableAuthRateLimit/);
assert.match(webhook, /stripeWebhookEvent/);
assert.match(webhook, /payloadHash/);
assert.match(webhook, /claimExistingWebhookEvent/);
assert.match(webhook, /invoice\.paid/);
assert.match(capabilities, /REVENUE_REALIZATION: \["PRO"\]/);
assert.match(offers, /REVORY_PAID_CHECKOUT_ENABLED/);
assert.match(analysisRuns, /reserveQuoteRecoveryAnalysisRunCapacity/);
assert.match(importAction, /const reservation =[\s\S]*reserveQuoteRecoveryAnalysisRunCapacity[\s\S]*result = await persistSecureIntakePlan/, "one-time capacity must be reserved before canonical persistence");
assert.match(importAction, /!capacitySettled && !canonicalCommitted/, "capacity cannot be released after canonical persistence commits");
assert.match(importAction, /createQuoteRecoveryAnalysisRun\(context\.workspace\.id, result\.created \? reservation : null, result\.session\.id\)/, "analysis repair must target the exact committed import session");
assert.match(analysisRuns, /id: importSessionId, workspaceId, status: "COMMITTED"/, "analysis creation must verify the requested import belongs to the workspace");
assert.match(boundedFormData, /received > maxBodyBytes/);
assert.match(checkout, /idempotencyKey: `revory-checkout:/);
assert.match(checkout, /workspace\.id}:\$\{offerKey}:\$\{priceId}/, "checkout idempotency must rotate when the configured price changes");
assert.match(checkout, /checkout\.sessions\.list/);
assert.match(checkout, /candidate\.line_items[\s\S]*observedPriceIds\[0\] === priceId/, "checkout reuse must match the currently configured price");
assert.match(webhook, /subscriptions\.retrieve/);
assert.match(entitlements, /ENTITLEMENT_QUARANTINED/, "invalid current Stripe state must quarantine existing access");
assert.match(entitlements, /SUBSCRIPTION_PRICE_MISMATCH/, "price mismatch must fail closed");
assert.match(entitlements, /stripeEventCreatedAt: existing\.stripeEventCreatedAt/, "concurrent Stripe state changes must use compare-and-set");
assert.match(entitlements, /changed concurrently; retry with current Stripe state/, "a lost Stripe compare-and-set must fail for a current-state retry");
assert.match(persistIntake, /quoteRecoverySnapshotJson: quoteRecoverySnapshot/, "the exact Quote Recovery snapshot must commit atomically with its import session");
assert.match(persistIntake, /FROM "workspaces"[\s\S]*FOR UPDATE/, "canonical full replacements must serialize per workspace");
assert.match(analysisRuns, /predates immutable analysis snapshots/, "historical repair must fail closed instead of borrowing the current workspace read");

await assert.rejects(() => assertCanonicalFileContent({ bytes: new Uint8Array([1, 2, 3]), fileName: "fake.xlsx", maxFileBytes: 1024 }), /signature/);
const zip = new JSZip();
zip.file("xl/worksheets/sheet1.xml", "0".repeat(2 * 1024 * 1024));
const compressed = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
await assert.rejects(() => assertCanonicalFileContent({ bytes: compressed, fileName: "bomb.xlsx", maxFileBytes: 8 * 1024 * 1024 }), /expansion/);

const small = new TextEncoder().encode("id,status\n1,open\n2,open");
const batch = await buildSecureIntakePlan({ workspaceId: "w", files: [{ bytes: small, entityType: "ESTIMATE", fileName: "a.csv", mimeType: "text/csv", sourceSystem: "a", mapping: { id: "externalId", status: "status" } }], limits: { maxFileBytes: 1024, maxFiles: 1, maxRowsPerFile: 10, maxTotalBytes: 1024, maxTotalRows: 1 } });
assert.equal(batch.accepted, false);
assert.ok(batch.issues.some((issue) => issue.code === "BATCH_TOO_LARGE"));

const integrityRunId = `sprint-11-integrity-${Date.now()}`;
const databaseLine = fs.readFileSync(".env", "utf8").split(/\r?\n/).find((line) => line.trim().startsWith("DATABASE_URL="));
assert.ok(databaseLine, "Sprint 11 integrity QA requires a local .env DATABASE_URL");
const databaseUrl = databaseLine.slice(databaseLine.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "");
assert.ok(["localhost", "127.0.0.1", "::1"].includes(new URL(databaseUrl).hostname), "Sprint 11 integrity QA refuses a non-local database");
const integrityUser = await prisma.user.create({
  data: {
    authProvider: "credentials",
    authSubject: integrityRunId,
    email: `${integrityRunId}@example.invalid`,
    status: "ACTIVE",
  },
});
const integrityWorkspace = await prisma.workspace.create({
  data: {
    name: "Sprint 11 integrity fixture",
    ownerUserId: integrityUser.id,
    slug: integrityRunId,
    status: "ACTIVE",
  },
});
const intakePlan = (externalId: string): IntakePlan => {
  const record: CanonicalRecordContract = {
    workspaceId: integrityWorkspace.id,
    entityType: "ESTIMATE",
    sourceSystem: "integrity-fixture",
    externalId,
    relationExternalIds: {},
    provenance: { fileName: `${externalId}.csv`, importedAt: new Date().toISOString(), rowNumber: 2, sourceHeaders: [] },
    payload: {
      externalId,
      amountCents: 2_500_000,
      createdAt: "2025-01-01T00:00:00.000Z",
      currency: "USD",
      nextFollowUpAt: "2025-01-10T00:00:00.000Z",
      nextStep: "Review",
      owner: "QA",
      status: "open",
    },
    occurredAt: "2025-01-01T00:00:00.000Z",
  };
  return {
    accepted: true,
    idempotencyKey: `integrity:${externalId}`,
    records: [record],
    issues: [],
    mappings: {},
    eligibility: {},
    linkCoverage: { linked: 0, unmatched: 0, conflicting: 0 },
  };
};
try {
  const importA = await persistSecureIntakePlan({ workspaceId: integrityWorkspace.id, plan: intakePlan("EST-A"), snapshotMode: "FULL_REPLACEMENT" });
  await persistSecureIntakePlan({ workspaceId: integrityWorkspace.id, plan: intakePlan("EST-B"), snapshotMode: "FULL_REPLACEMENT" });
  const repairedA = await createQuoteRecoveryAnalysisRun(integrityWorkspace.id, null, importA.session.id);
  const repairedSnapshot = JSON.stringify(repairedA.findingSnapshotJson);
  assert.match(repairedSnapshot, /EST-A/, "historical repair must use import A's atomic snapshot");
  assert.doesNotMatch(repairedSnapshot, /EST-B/, "historical repair must not borrow import B's active state");

  await Promise.all(
    Array.from({ length: 12 }, (_, index) => persistSecureIntakePlan({
      workspaceId: integrityWorkspace.id,
      plan: intakePlan(`EST-CONCURRENT-${index + 1}`),
      snapshotMode: "FULL_REPLACEMENT",
    })),
  );
  const activeReplacementRecords = await prisma.canonicalRecord.findMany({
    where: {
      workspaceId: integrityWorkspace.id,
      entityType: "ESTIMATE",
      sourceSystem: "integrity-fixture",
      isActive: true,
    },
    select: { externalId: true },
  });
  assert.equal(activeReplacementRecords.length, 1, "concurrent full replacements must leave exactly one active version per scope");

  const entitlement = await prisma.workspaceEntitlement.create({
    data: { workspaceId: integrityWorkspace.id, offerKey: "STARTER", stripeSubscriptionId: `sub_${integrityRunId}` },
  });
  const [left, right] = await Promise.all([
    prisma.workspaceEntitlement.updateMany({
      where: { id: entitlement.id, stripeEventCreatedAt: entitlement.stripeEventCreatedAt },
      data: { status: "ACTIVE", stripeEventCreatedAt: new Date(Date.now() + 1_000) },
    }),
    prisma.workspaceEntitlement.updateMany({
      where: { id: entitlement.id, stripeEventCreatedAt: entitlement.stripeEventCreatedAt },
      data: { status: "REVOKED", stripeEventCreatedAt: new Date(Date.now() + 2_000) },
    }),
  ]);
  assert.equal(left.count + right.count, 1, "only one concurrent entitlement compare-and-set may commit");
} finally {
  await prisma.workspace.delete({ where: { id: integrityWorkspace.id } });
  await prisma.user.delete({ where: { id: integrityUser.id } });
  await prisma.$disconnect();
}

for (const route of ["security", "privacy", "terms", "subprocessors", "ai-disclosure", "limitations", "dpa"]) assert.ok(fs.existsSync(`src/app/${route}/page.tsx`));
const limitations = fs.readFileSync("docs/launch/REVORY_MVP_KNOWN_LIMITATIONS.md", "utf8");
assert.doesNotMatch(limitations, /MedSpa|appointment revenue|provider utilization/i);

const trackedTmpFiles = execFileSync("git", ["ls-files", ".tmp"], { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
for (const file of trackedTmpFiles) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, "utf8");
  assert.doesNotMatch(content, /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/, `${file} must not contain a serialized JWT`);
  assert.doesNotMatch(content, /["']__session["'][\s\S]{0,160}["']value["']\s*:\s*["'][^"']{24,}/, `${file} must not contain a serialized session cookie value`);
}

console.log("Sprint 11 local Pro controls, auth revocation, upload safety, webhook replay ledger and legal surfaces: PASS");
