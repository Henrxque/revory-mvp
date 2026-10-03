import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium, type Browser } from "playwright";
import { encode } from "next-auth/jwt";
import { prisma } from "../db/prisma";
import { ACCOUNT_CREATION_LEGAL_VERSIONS } from "../content/revory-legal";

const database = new URL(process.env.DATABASE_URL!);
if (!/^\/revory_sprint1_[a-f0-9]{12}$/.test(database.pathname) || !["localhost", "127.0.0.1", "::1"].includes(database.hostname)) throw new Error("Use disposable DB harness.");
const baseUrl = "http://localhost:3147", outputDir = "docs/qa/ai-integrity-sprint7", authSecret = randomBytes(32).toString("hex");
await mkdir(outputDir, { recursive: true });
const user = await prisma.user.create({ data: { email: "sprint7-browser@example.invalid", fullName: "Synthetic QA", status: "ACTIVE", authSubject: "sprint7-browser", authProvider: "google", emailVerifiedAt: new Date() } });
const workspace = await prisma.workspace.create({ data: { name: "Aster AI · Source rehearsal", slug: "sprint7-browser", ownerUserId: user.id } });
await prisma.legalAcceptance.create({ data: { userId: user.id, workspaceId: workspace.id, event: "ACCOUNT_CREATED", documentVersionsJson: ACCOUNT_CREATION_LEGAL_VERSIONS, contextJson: { synthetic: true } } });
const originalNextEnv = await readFile("next-env.d.ts", "utf8");
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--port", "3147", "--hostname", "127.0.0.1"], { windowsHide: true, stdio: ["ignore", "ignore", "ignore"], env: { ...process.env, NODE_ENV: "development", AUTH_SECRET: authSecret, NEXTAUTH_URL: baseUrl, NEXT_PUBLIC_APP_URL: baseUrl, REVORY_AI_SAAS_PREVIEW: "true", REVORY_AI_SOURCE_REHEARSAL: "true", REVORY_QA_DIST_DIR: ".tmp/ai-integrity-sprint7-next", AUTH_GOOGLE_CLIENT_ID: "", AUTH_GOOGLE_CLIENT_SECRET: "", RESEND_API_KEY: "", STRIPE_SECRET_KEY: "", OPENAI_API_KEY: "", REVORY_AI_SCAN_TEST_SECRET_KEY: "", REVORY_AI_SCAN_TEST_PRICE_ID: "", REVORY_AI_SCAN_TEST_WEBHOOK_SECRET: "" } });
let browser: Browser | undefined;
try {
  browser = await chromium.launch({ headless: true });
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error("Isolated Next server exited.");
    try { if ((await fetch(`${baseUrl}/`, { signal: AbortSignal.timeout(2000) })).ok) break; } catch { /* initial compile */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const context = await browser.newContext({ baseURL: baseUrl, viewport: { width: 1280, height: 800 } }), page = await context.newPage(), errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message)); page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  assert.equal((await context.request.post("/api/ai-integrity/sources", { data: { action: "CONSENT" } })).status(), 401);
  const token = await encode({ secret: authSecret, token: { sub: "sprint7-browser", email: user.email, name: user.fullName, authProvider: "google" } });
  await context.addCookies([{ name: "next-auth.session-token", value: token, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
  await page.goto(`${baseUrl}/app/ai-integrity/sources`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Prepare source reads. Preserve their limits." }).waitFor();
  assert.equal(await page.getByRole("textbox").count(), 0, "No API keys or customer data collected");
  assert.equal(await page.getByRole("button", { name: "Allow Stripe rehearsal" }).isDisabled(), true);
  async function capture(name: string) {
    await page.screenshot({ path: `${outputDir}/${name}-desktop.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Mobile overflow");
    await page.screenshot({ path: `${outputDir}/${name}-mobile.png`, fullPage: true }); await page.setViewportSize({ width: 1280, height: 800 });
  }
  await capture("consent");
  await page.getByRole("checkbox").nth(0).check(); await page.getByRole("button", { name: "Allow Stripe rehearsal" }).click();
  await page.getByRole("button", { name: "Revoke Stripe rehearsal" }).waitFor();
  await page.getByRole("checkbox").last().check(); await page.getByRole("button", { name: "Allow OpenAI rehearsal" }).click();
  await page.getByRole("button", { name: "Revoke OpenAI rehearsal" }).waitFor();
  await page.getByRole("button", { name: "Read August 1", exact: true }).nth(0).click();
  await page.getByText("Completed synthetic read", { exact: true }).first().waitFor();
  await page.getByRole("button", { name: "Read August 1", exact: true }).nth(1).click();
  await page.getByRole("link", { name: "Download source evidence JSON →" }).nth(1).waitFor();
  await page.getByRole("button", { name: "Extend through August 2", exact: true }).nth(1).click();
  await page.getByText("Read through: 2026-08-03 UTC (exclusive)").waitFor();
  await capture("reads");
  const source = await prisma.aiIntegritySourceConnection.findUniqueOrThrow({ where: { workspaceId_provider_mode: { workspaceId: workspace.id, provider: "OPENAI", mode: "SYNTHETIC_REHEARSAL" } } });
  const initial = await prisma.aiIntegritySourceSync.findFirstOrThrow({ where: { connectionId: source.id }, orderBy: { createdAt: "asc" } });
  const incremental = await prisma.aiIntegritySourceSync.findFirstOrThrow({ where: { connectionId: source.id }, orderBy: { createdAt: "desc" } });
  assert.equal(incremental.effectiveStart?.toISOString(), initial.windowEnd.toISOString(), "Browser incremental read must begin at the previous checkpoint");
  const exported = await context.request.get(`/api/ai-integrity/sources/${initial.id}/export`); assert.equal(exported.status(), 200);
  const contents = await exported.json(); assert.equal(contents.artifact.mode, "SYNTHETIC_REHEARSAL"); assert.equal(contents.artifact.channels.length, 2);
  assert.equal(await prisma.aiIntegrityImportBatch.count(), 0); assert.equal(await prisma.aiIntegritySnapshot.count(), 0); assert.equal(await prisma.aiIntegrityScanGrant.count(), 0);
  await page.getByRole("button", { name: "Revoke OpenAI rehearsal" }).click(); await page.getByRole("button", { name: "Allow OpenAI rehearsal" }).waitFor();
  await capture("revoked");
  const revokedRead = await context.request.post("/api/ai-integrity/sources", { data: { action: "SYNC", connectionId: source.id, requestKey: "browser_revoked_read_001", windowStart: "2026-08-01T00:00:00.000Z", windowEnd: "2026-08-02T00:00:00.000Z", lagHours: 24 } }); assert.equal(revokedRead.status(), 400);
  assert.equal((await context.request.post("/api/ai-integrity/sources", { headers: { origin: "https://other.invalid" }, data: { action: "CONSENT" } })).status(), 403);
  assert.equal((await context.request.post("/api/ai-integrity/sources", { data: { action: "CONSENT", provider: "STRIPE", syntheticConsentConfirmed: true, apiKey: "not_a_key" } })).status(), 400);
  assert.equal((await context.request.get("/api/ai-integrity/sources/not-a-read/export")).status(), 404);
  assert.deepEqual(errors, []);
  await writeFile(`${outputDir}/verification.json`, JSON.stringify({ verifiedAt: new Date().toISOString(), mode: "SYNTHETIC_REHEARSAL", realProviderConnections: 0, externalProviderRequests: 0, automaticScans: 0, flow: "auth → synthetic consent → Stripe/OpenAI paginated reads → incremental checkpoint → evidence export → revocation", screenshots: 6, consoleErrors: errors, horizontalOverflow: false }, null, 2) + "\n");
  console.log("Sprint 7 browser PASS: consent/read/increment/export/revoke, no key form or automatic scan, auth/origin/strict fields, desktop/mobile and no console errors.");
} finally {
  await browser?.close();
  if (server.pid && server.exitCode === null) { if (process.platform === "win32") execFileSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }); else server.kill("SIGTERM"); }
  const nextEnv = await readFile("next-env.d.ts", "utf8"); if (nextEnv.includes("ai-integrity-sprint7-next")) await writeFile("next-env.d.ts", originalNextEnv);
  const config = JSON.parse(await readFile("tsconfig.json", "utf8")); config.include = config.include.filter((entry: string) => !entry.includes("ai-integrity-sprint7-next")); await writeFile("tsconfig.json", JSON.stringify(config, null, 2) + "\n");
  await prisma.$disconnect();
}
