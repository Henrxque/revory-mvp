import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium, type Browser } from "playwright";
import { encode } from "next-auth/jwt";
import { prisma } from "../db/prisma";
import { ACCOUNT_CREATION_LEGAL_VERSIONS } from "../content/revory-legal";
import { sprint8Fixture } from "./fixtures/ai-saas/sprint-8";
import { seedSprint8Report } from "./fixtures/ai-saas/sprint-8-db";

const database = new URL(process.env.DATABASE_URL!);
if (!/^\/revory_sprint1_[a-f0-9]{12}$/.test(database.pathname) || !["localhost", "127.0.0.1", "::1"].includes(database.hostname)) throw new Error("Use disposable DB harness.");
const baseUrl = "http://localhost:3148", outputDir = "docs/qa/ai-integrity-sprint8", authSecret = randomBytes(32).toString("hex");
await mkdir(outputDir, { recursive: true });
const user = await prisma.user.create({ data: { email: "sprint8-browser@example.invalid", fullName: "Synthetic QA", status: "ACTIVE", authSubject: "sprint8-browser", authProvider: "google", emailVerifiedAt: new Date() } });
const workspace = await prisma.workspace.create({ data: { name: "Aster AI · Monitoring rehearsal", slug: "sprint8-browser", ownerUserId: user.id } });
await prisma.legalAcceptance.create({ data: { userId: user.id, workspaceId: workspace.id, event: "ACCOUNT_CREATED", documentVersionsJson: ACCOUNT_CREATION_LEGAL_VERSIONS, contextJson: { synthetic: true } } });
const a = await seedSprint8Report(workspace.id, user.id, sprint8Fixture(1));
const b = await seedSprint8Report(workspace.id, user.id, sprint8Fixture(2, "140", "2.5"));
const c = await seedSprint8Report(workspace.id, user.id, sprint8Fixture(3, "100", "0"));
const originalNextEnv = await readFile("next-env.d.ts", "utf8");
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--port", "3148", "--hostname", "127.0.0.1"], { windowsHide: true, stdio: ["ignore", "ignore", "ignore"], env: { ...process.env, NODE_ENV: "development", AUTH_SECRET: authSecret, NEXTAUTH_URL: baseUrl, NEXT_PUBLIC_APP_URL: baseUrl,
  REVORY_AI_SAAS_PREVIEW: "true", REVORY_AI_SOURCE_REHEARSAL: "false", REVORY_AI_MONITOR_REHEARSAL: "true", REVORY_QA_DIST_DIR: ".tmp/ai-integrity-sprint8-next", AUTH_GOOGLE_CLIENT_ID: "", AUTH_GOOGLE_CLIENT_SECRET: "", RESEND_API_KEY: "", STRIPE_SECRET_KEY: "", OPENAI_API_KEY: "", REVORY_AI_SCAN_TEST_SECRET_KEY: "", REVORY_AI_SCAN_TEST_PRICE_ID: "", REVORY_AI_SCAN_TEST_WEBHOOK_SECRET: "" } });
let browser: Browser | undefined;
try {
  browser = await chromium.launch({ headless: true });
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error("Isolated Next server exited.");
    try { if ((await fetch(`${baseUrl}/`, { signal: AbortSignal.timeout(2000) })).ok) break; } catch { /* Initial compile. */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const context = await browser.newContext({ baseURL: baseUrl, viewport: { width: 1280, height: 800 } }), page = await context.newPage(), errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message)); page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  assert.equal((await context.request.post("/api/ai-integrity/monitoring", { data: { action: "COMPARE" } })).status(), 401);
  const token = await encode({ secret: authSecret, token: { sub: "sprint8-browser", email: user.email, name: user.fullName, authProvider: "google" } });
  await context.addCookies([{ name: "next-auth.session-token", value: token, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
  await page.goto(`${baseUrl}/app/ai-integrity/monitoring`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "See what changed. Keep the evidence." }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Compare synthetic reports" }).isDisabled(), true);
  async function capture(name: string) {
    await page.screenshot({ path: `${outputDir}/${name}-desktop.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Mobile overflow");
    await page.screenshot({ path: `${outputDir}/${name}-mobile.png`, fullPage: true }); await page.setViewportSize({ width: 1280, height: 800 });
  }
  await capture("empty");
  await page.getByRole("combobox", { name: "Baseline report" }).selectOption(a.snapshotId);
  await page.getByRole("combobox", { name: "Later report" }).selectOption(b.snapshotId);
  await page.getByRole("checkbox").check(); await page.getByRole("button", { name: "Compare synthetic reports" }).click();
  await page.getByText("Comparable evidence", { exact: true }).waitFor();
  await page.getByText("20 → 40 tokens · change 20", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Acknowledge alert" }).first().click();
  await page.getByText("Acknowledged", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Compare synthetic reports" }).click();
  await page.getByText("Existing comparison opened. No duplicate alerts created.").waitFor();
  assert.equal(await prisma.aiIntegrityMonitorComparison.count(), 1); assert.equal(await prisma.aiIntegrityMonitorAlert.count(), 2);
  await capture("movement");
  const saved = await prisma.aiIntegrityMonitorComparison.findFirstOrThrow({ where: { workspaceId: workspace.id } });
  const exported = await context.request.get(`/api/ai-integrity/monitoring/${saved.id}/export`); assert.equal(exported.status(), 200);
  const artifact = await exported.json(); assert.equal(artifact.artifact.counts.persistent, 2); assert.equal(artifact.artifact.mode, "SYNTHETIC_REHEARSAL");
  await page.getByRole("combobox", { name: "Baseline report" }).selectOption(b.snapshotId);
  await page.getByRole("combobox", { name: "Later report" }).selectOption(c.snapshotId);
  await page.getByRole("button", { name: "Compare synthetic reports" }).click();
  await page.getByText("40 → 0 tokens · change -40", { exact: true }).waitFor();
  await capture("no-longer-observed");
  const limited = await context.request.post("/api/ai-integrity/monitoring", { data: { action: "COMPARE", baselineSnapshotId: a.snapshotId, currentSnapshotId: c.snapshotId, requestKey: "browser_limited_001", syntheticDataConfirmed: true } }); assert.equal(limited.status(), 200);
  await page.reload({ waitUntil: "networkidle" }); await page.getByText("Limit: ADJACENT_EQUAL_DURATION_WINDOWS_REQUIRED").waitFor(); await capture("limited");
  assert.equal((await context.request.post("/api/ai-integrity/monitoring", { headers: { origin: "https://other.invalid" }, data: { action: "COMPARE" } })).status(), 403);
  assert.equal((await context.request.post("/api/ai-integrity/monitoring", { data: { action: "COMPARE", baselineSnapshotId: a.snapshotId, currentSnapshotId: b.snapshotId, requestKey: "browser_extra_002", syntheticDataConfirmed: true, subscription: true } })).status(), 400);
  assert.equal((await context.request.get("/api/ai-integrity/monitoring/not-a-comparison/export")).status(), 404);
  assert.equal(await prisma.aiIntegrityScanOrder.count(), 0); assert.equal(await prisma.aiIntegrityScanGrant.count(), 0); assert.equal(await prisma.aiIntegritySourceConnection.count(), 0);
  assert.equal(await prisma.aiIntegritySnapshot.count(), 3, "Monitoring does not run extra scans"); assert.deepEqual(errors, []);
  await writeFile(`${outputDir}/verification.json`, JSON.stringify({ verifiedAt: new Date().toISOString(), mode: "SYNTHETIC_REHEARSAL", flow: "existing reports → comparison → local alerts → acknowledgment → replay/export → no-longer-observed → limited evidence", screenshots: 8, consoleErrors: errors, horizontalOverflow: false, realProviderConnections: 0, automaticScans: 0, emailsSent: 0, subscriptionsCreated: 0 }, null, 2) + "\n");
  console.log("Sprint 8 browser PASS: compare/acknowledge/replay/export, movements and limited evidence, strict auth/origin, desktop/mobile. No scheduled reads, email, subscription or automatic scans.");
} finally {
  await browser?.close();
  if (server.pid && server.exitCode === null) { if (process.platform === "win32") execFileSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }); else server.kill("SIGTERM"); }
  const nextEnv = await readFile("next-env.d.ts", "utf8"); if (nextEnv.includes("ai-integrity-sprint8-next")) await writeFile("next-env.d.ts", originalNextEnv);
  const config = JSON.parse(await readFile("tsconfig.json", "utf8")); config.include = config.include.filter((entry: string) => !entry.includes("ai-integrity-sprint8-next")); await writeFile("tsconfig.json", JSON.stringify(config, null, 2) + "\n");
  await prisma.$disconnect();
}
