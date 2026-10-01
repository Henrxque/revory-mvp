import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium, type Browser } from "playwright";
import { encode } from "next-auth/jwt";
import { prisma } from "../db/prisma";
import { ACCOUNT_CREATION_LEGAL_VERSIONS } from "../content/revory-legal";
import { persistAiIntegrityBatch } from "../services/ai-integrity/persist-batch";
import { createAiIdentityMapping } from "../services/ai-integrity/identity";
import type { AiIntegrityBatchInput } from "../domain/ai-integrity/contracts";
import { sprint4Fixture } from "./fixtures/ai-saas/sprint-4";

const database = new URL(process.env.DATABASE_URL!);
if (!/^\/revory_sprint1_[a-f0-9]{12}$/.test(database.pathname) || !["localhost", "127.0.0.1", "::1"].includes(database.hostname)) throw new Error("Browser test requires the disposable database harness.");
const baseUrl = "http://localhost:3144";
const authSecret = randomBytes(32).toString("hex");
const outputDir = "docs/qa/ai-integrity-sprint4";
await mkdir(outputDir, { recursive: true });
const fixture = sprint4Fixture();
const user = await prisma.user.create({ data: { email: "sprint4-browser@example.invalid", fullName: "Synthetic QA", status: "ACTIVE", authSubject: "sprint4-browser", authProvider: "google", emailVerifiedAt: new Date() } });
const workspace = await prisma.workspace.create({ data: { name: "Synthetic AI SaaS", slug: "sprint4-browser", ownerUserId: user.id } });
await prisma.legalAcceptance.create({ data: { userId: user.id, workspaceId: workspace.id, event: "ACCOUNT_CREATED", documentVersionsJson: ACCOUNT_CREATION_LEGAL_VERSIONS, contextJson: { synthetic: true } } });
const batches: Record<string, string> = {};
for (const batch of fixture.batches) {
  const records = batch.sourceKind === "STRIPE_REVENUE" ? fixture.revenue.map((r) => ({ ...r, currencyExponent: 2 })) : batch.sourceKind === "INTERNAL_LEDGER" ? fixture.usage : fixture.buckets;
  const input = { workspaceId: workspace.id, sourceKind: batch.sourceKind, sourceSystem: batch.sourceSystem, fileName: `${batch.id}.csv`,
    fileSha256: batch.fileSha256, mappingSha256: batch.mappingSha256, windowStart: batch.windowStart, windowEnd: batch.windowEnd, sourceTimezone: "UTC", dataQuality: {},
    records: records.map((r) => ({ ...r, workspaceId: workspace.id, sourcePayload: { synthetic: true, externalId: r.externalId }, provenance: { synthetic: true } })) } as AiIntegrityBatchInput;
  batches[batch.sourceKind] = (await persistAiIntegrityBatch(input)).batch.id;
}
await createAiIdentityMapping({ workspaceId: workspace.id, actorUserId: user.id, kind: "PROVIDER_PROJECT", externalId: "proj_a", internalCustomerExternalId: "customer_a",
  sourceBatchId: batches.PROVIDER_REPORT, ledgerBatchId: batches.INTERNAL_LEDGER, provider: "openai", organizationId: "org_a", exclusiveProjectConfirmed: true,
  validFrom: "2026-08-01T00:00:00Z", validUntil: "2026-09-01T00:00:00Z" });
let log = "";
const originalNextEnv = await readFile("next-env.d.ts", "utf8");
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--port", "3144", "--hostname", "127.0.0.1"], {
  windowsHide: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NODE_ENV: "development", AUTH_SECRET: authSecret,
    NEXTAUTH_URL: baseUrl, NEXT_PUBLIC_APP_URL: baseUrl, REVORY_INTERNAL_PREVIEW_MODE: "true", REVORY_QA_DIST_DIR: ".tmp/ai-integrity-sprint4-next",
    AUTH_GOOGLE_CLIENT_ID: "", AUTH_GOOGLE_CLIENT_SECRET: "", RESEND_API_KEY: "", STRIPE_SECRET_KEY: "", OPENAI_API_KEY: "" },
});
server.stdout.on("data", (v) => { log += String(v); }); server.stderr.on("data", (v) => { log += String(v); });
let browser: Browser | undefined;
try {
  browser = await chromium.launch({ headless: true });
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error("Isolated dev server exited unexpectedly.");
    try { if ((await fetch(`${baseUrl}/sign-in`, { signal: AbortSignal.timeout(2000) })).ok) break; } catch { /* wait for local compilation */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const token = await encode({ secret: authSecret, token: { sub: "sprint4-browser", email: user.email, name: user.fullName, authProvider: "google" } });
  const context = await browser.newContext({ baseURL: baseUrl, viewport: { width: 1280, height: 800 } });
  await context.addCookies([{ name: "next-auth.session-token", value: token, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  const response = await page.goto(`${baseUrl}/app/ai-integrity/scans`, { waitUntil: "networkidle", timeout: 90000 });
  assert.equal(response?.status(), 200);
  await page.getByRole("heading", { name: "Reconcile with evidence." }).waitFor();
  assert.equal(await page.locator("[data-nextjs-dialog]").count(), 0);
  await page.screenshot({ path: `${outputDir}/form-desktop.png`, fullPage: true });
  const fields = page.locator("fieldset");
  for (const [index, source] of ["STRIPE_REVENUE", "INTERNAL_LEDGER", "PROVIDER_REPORT"].entries()) {
    await fields.nth(index).getByRole("combobox").selectOption(batches[source]);
    await page.locator(`input[name="${source}-exportedAt"]`).fill("2026-09-03T00:00:00Z");
    await page.locator(`input[name="${source}-completeThrough"]`).fill("2026-09-01T00:00:00Z");
  }
  await page.locator('input[name="asOf"]').fill("2026-09-04T00:00:00Z");
  await page.locator('input[name="lagHours"]').fill("24");
  await page.locator('input[name="closure"]').check(); await page.locator('input[name="synthetic"]').check();
  const postResponse = page.waitForResponse((r) => r.url().endsWith("/api/ai-integrity/scans") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Run internal scan" }).click();
  const posted = await postResponse;
  assert.equal(posted.status(), 200, await posted.text());
  const { snapshotId } = await posted.json();
  await page.getByRole("heading", { name: "Snapshot results" }).waitFor();
  await page.getByRole("heading", { name: "Ledger ↔ provider usage difference" }).waitFor();
  assert.equal(await prisma.aiIntegrityFinding.count({ where: { workspaceId: workspace.id, snapshotId } }), 2);
  await page.screenshot({ path: `${outputDir}/results-desktop.png`, fullPage: true });
  const exported = await context.request.get(`/api/ai-integrity/scans/${snapshotId}/export`);
  assert.equal(exported.status(), 200); assert.equal((await exported.json()).result.findings.length, 2);
  const csv = await context.request.get(`/api/ai-integrity/scans/${snapshotId}/export?format=csv`);
  assert.equal(csv.status(), 200); assert.ok((await csv.text()).includes("LEDGER_PROVIDER_USAGE_MISMATCH"));
  const badOrigin = await context.request.post("/api/ai-integrity/scans", { headers: { Origin: "https://example.invalid" }, data: {} });
  assert.equal(badOrigin.status(), 403);
  const unauth = await browser.newContext();
  assert.equal((await unauth.request.post(`${baseUrl}/api/ai-integrity/scans`, { data: {} })).status(), 401);
  await unauth.close();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${outputDir}/results-mobile.png`, fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "Mobile horizontal overflow");
  await page.getByRole("link", { name: "Review identity and coverage" }).click();
  await page.getByRole("heading", { name: "Only explicit identity earns attribution." }).waitFor();
  assert.deepEqual(errors, []);
  console.log("Sprint 4 browser PASS: authenticated form → API → persisted findings → desktop/mobile result → JSON/CSV; origin and unauthenticated requests rejected; no console errors or horizontal overflow.");
} finally {
  await browser?.close();
  if (server.pid && server.exitCode === null) {
    if (process.platform === "win32") execFileSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    else server.kill("SIGTERM");
  }
  await mkdir(".tmp", { recursive: true }); await writeFile(".tmp/ai-integrity-sprint4-browser.log", log);
  // Next adds its isolated type directory. Remove only this harness's generated references.
  const tsconfig = await readFile("tsconfig.json", "utf8");
  await writeFile("tsconfig.json", tsconfig.replace(/,\r?\n\s*"\.tmp\/ai-integrity-sprint4-next\/(?:dev\/)?types\/\*\*\/\*\.ts"/g, ""));
  const nextEnv = await readFile("next-env.d.ts", "utf8");
  const originalImport = originalNextEnv.match(/^import .*routes\.d\.ts.*;$/m)?.[0];
  if (originalImport) await writeFile("next-env.d.ts", nextEnv.replace(/^import "\.\/\.tmp\/ai-integrity-sprint4-next\/dev\/types\/routes\.d\.ts";$/m, originalImport));
  await prisma.$disconnect();
}
