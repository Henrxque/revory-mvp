import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { encode } from "next-auth/jwt";
import type { AiIntegrityBatchInput } from "../domain/ai-integrity/contracts";
import { prisma } from "../db/prisma";

export async function verifyMonitorBrowser(workspaceId: string, user: { email: string; authSubject: string | null }, ledger: { batch: AiIntegrityBatchInput; exportedAt: string; completeThrough: string }) {
  const baseUrl = "http://localhost:3159", secret = randomBytes(32).toString("hex"), output = "docs/qa/recurring-monitor";
  await mkdir(output, { recursive: true });
  const nextEnv = await readFile("next-env.d.ts", "utf8"), tsconfig = await readFile("tsconfig.json", "utf8");
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--port", "3159", "--hostname", "127.0.0.1"], {
    windowsHide: true, stdio: "ignore", env: { ...process.env, NODE_ENV: "development", AUTH_SECRET: secret, NEXTAUTH_SECRET: secret, NEXTAUTH_URL: baseUrl, NEXT_PUBLIC_APP_URL: baseUrl, REVORY_QA_DIST_DIR: ".tmp/recurring-monitor-next",
      RESEND_API_KEY: "", STRIPE_SECRET_KEY: "", OPENAI_API_KEY: "", REVORY_AI_MONITOR_STRIPE_KEY: "", AUTH_GOOGLE_CLIENT_ID: "", AUTH_GOOGLE_CLIENT_SECRET: "" },
  });
  const browser = await chromium.launch({ headless: true });
  try {
    for (let attempt = 0; attempt < 90; attempt++) {
      if (server.exitCode !== null) throw new Error("Isolated monitoring server exited.");
      try { if ((await fetch(baseUrl + "/api/auth/csrf", { signal: AbortSignal.timeout(2000) })).ok) break; } catch { /* Initial compile. */ }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, baseURL: baseUrl });
    const page = await context.newPage(), errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    assert.equal((await context.request.get("/api/ai-integrity/recurring")).status(), 403);
    assert.equal((await context.request.post("/api/ai-integrity/ledger/" + workspaceId, { data: {} })).status(), 401);
    const jwt = await encode({ secret, token: { sub: user.authSubject!, email: user.email, authProvider: "google" } });
    await context.addCookies([{ name: "next-auth.session-token", value: jwt, domain: "localhost", path: "/" }]);
    await page.goto(baseUrl + "/app/ai-integrity/monitoring", { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Know what changed. Know what to review." }).waitFor();
    await page.getByRole("heading", { name: "Monitor · US$399/month" }).waitFor();
    await page.getByRole("button", { name: "Pause monitoring", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "Saved." }).waitFor();
    await page.getByText(/Paused · 1-day periods/).waitFor();
    const response = await context.request.post("/api/ai-integrity/recurring", { headers: { origin: "https://foreign.invalid" }, data: { action: "PAUSE" } });
    assert.equal(response.status(), 403);
    await page.getByLabel(/I authorize recurring reads within this scope/).check();
    await page.getByRole("button", { name: "Renew consent and resume" }).click();
    await page.getByText(/Active · 1-day periods/).waitFor();
    const review = page.locator("article").filter({ has: page.getByRole("button", { name: "Save investigation", exact: true }) }).first();
    await review.getByLabel("What did you check?").fill("Browser fixture review. No real customer or money recovered.");
    await review.getByLabel("Investigation status").selectOption("INVESTIGATING");
    await review.getByRole("button", { name: "Save investigation", exact: true }).click();
    await page.getByText("Investigating: Browser fixture review. No real customer or money recovered.").waitFor();
    const comparison = await prisma.aiIntegrityMonitorComparison.findFirstOrThrow({ where: { workspaceId, mode: "CONNECTED_MONITOR" } });
    const download = await context.request.get("/api/ai-integrity/monitoring/" + comparison.id + "/export");
    assert.equal(download.status(), 200); assert.equal((await download.json()).artifact.mode, "CONNECTED_MONITOR");
    await page.getByText("Automate ledger delivery from your backend", { exact: true }).click();
    const tokenResponse = page.waitForResponse(response => response.url().endsWith("/api/ai-integrity/recurring") && response.request().postDataJSON()?.action === "TOKEN");
    await page.getByRole("button", { name: "Create or replace token" }).click();
    const apiToken = (await (await tokenResponse).json()).token;
    assert.equal(typeof apiToken, "string");
    const apiLedger = await context.request.post("/api/ai-integrity/ledger/" + workspaceId, { headers: { authorization: "Bearer " + apiToken }, data: ledger });
    assert.equal(apiLedger.status(), 202, await apiLedger.text());
    await page.getByRole("button", { name: "Revoke token", exact: true }).click();
    await page.getByLabel("Copy once and store securely").waitFor({ state: "hidden" });
    assert.equal((await context.request.post("/api/ai-integrity/ledger/" + workspaceId, { headers: { authorization: "Bearer " + apiToken }, data: ledger })).status(), 401);
    await page.getByText("Automate ledger delivery from your backend", { exact: true }).click();
    await page.screenshot({ path: output + "/desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: output + "/mobile.png", fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    await writeFile(output + "/verification.json", JSON.stringify({ fixtureOnly: true, realPayments: 0, realEmails: 0, realProviderReads: 0, verifiedAt: new Date().toISOString(), flows: ["workspace session", "pause", "renew consent", "investigation note", "comparison export", "origin rejection", "ledger authentication and real HTTP ingestion", "desktop and mobile"], horizontalOverflow: false, pageErrors: errors }, null, 2) + "\n");
    console.log("PASS: recurring browser flow, pause/resume, investigation, comparison download, auth/origin and mobile.");
  } finally {
    await browser.close();
    if (server.pid && server.exitCode === null) {
      if (process.platform === "win32") execFileSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
      else server.kill("SIGTERM");
    }
    const current = await readFile("next-env.d.ts", "utf8");
    if (current.includes("recurring-monitor-next")) await writeFile("next-env.d.ts", nextEnv);
    const currentConfig = await readFile("tsconfig.json", "utf8");
    if (currentConfig.includes("recurring-monitor-next")) await writeFile("tsconfig.json", tsconfig);
  }
}
