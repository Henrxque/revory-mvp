import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";

const projectRoot = "C:/Users/hriqu/Documents/revory-mvp";
const evidenceDir = path.join(projectRoot, ".tmp", "qa-evidence");
fs.mkdirSync(evidenceDir, { recursive: true });

const keyless = JSON.parse(
  fs.readFileSync(path.join(projectRoot, ".clerk", ".tmp", "keyless.json"), "utf8"),
);

process.env.CLERK_PUBLISHABLE_KEY = keyless.publishableKey;
process.env.CLERK_SECRET_KEY = keyless.secretKey;
await clerkSetup({
  publishableKey: keyless.publishableKey,
  secretKey: keyless.secretKey,
});

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const consoleMessages = [];
const pageErrors = [];
const failedRequests = [];
const responses = [];

page.on("console", (message) => {
  consoleMessages.push({
    text: message.text(),
    type: message.type(),
  });
});

page.on("pageerror", (error) => {
  pageErrors.push(String(error));
});

page.on("requestfailed", (request) => {
  failedRequests.push({
    errorText: request.failure()?.errorText ?? "",
    method: request.method(),
    url: request.url(),
  });
});

page.on("response", async (response) => {
  const url = response.url();

  if (url.includes("clerk") || url.includes("/v1/")) {
    responses.push({
      status: response.status(),
      url,
    });
  }
});

try {
  await page.goto("http://127.0.0.1:3000/");
  await setupClerkTestingToken({
    page,
    options: {
      frontendApiUrl: "touched-albacore-54.clerk.accounts.dev",
    },
  });
  await page.goto("http://127.0.0.1:3000/sign-up", { waitUntil: "networkidle" });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(evidenceDir, "sign-up.png"), fullPage: true });

  const inputs = await page.locator("input").evaluateAll((elements) =>
    elements.map((element) => ({
      name: element.getAttribute("name"),
      placeholder: element.getAttribute("placeholder"),
      type: element.getAttribute("type"),
    })),
  );

  const buttons = await page.locator("button").evaluateAll((elements) =>
    elements.map((element) => element.textContent?.trim()).filter(Boolean),
  );

  const labels = await page.locator("label").evaluateAll((elements) =>
    elements.map((element) => element.textContent?.trim()).filter(Boolean),
  );

  const frames = page.frames().map((frame) => frame.url());
  const bodyHtml = await page.locator("body").innerHTML();

  console.log(
    JSON.stringify(
      {
        bodySnippet: bodyHtml.slice(0, 4000),
        buttons,
        consoleMessages,
        failedRequests,
        frames,
        inputs,
        labels,
        pageErrors,
        responses,
        title: await page.title(),
        url: page.url(),
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
