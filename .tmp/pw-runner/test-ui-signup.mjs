import fs from "node:fs";
import { chromium } from "playwright";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";

const keyless = JSON.parse(fs.readFileSync(".clerk/.tmp/keyless.json", "utf8"));
process.env.CLERK_PUBLISHABLE_KEY = keyless.publishableKey;
process.env.CLERK_SECRET_KEY = keyless.secretKey;
await clerkSetup({ publishableKey: keyless.publishableKey, secretKey: keyless.secretKey });

const email = `revory-ui-${Date.now()}+clerk_test@example.com`;
const password = "Revory!12345";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto("http://127.0.0.1:3300/");
  await setupClerkTestingToken({
    page,
    options: {
      frontendApiUrl: "touched-albacore-54.clerk.accounts.dev",
    },
  });
  await page.goto("http://127.0.0.1:3300/sign-up", { waitUntil: "networkidle" });
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { exact: true, name: "Continue" }).click();
  await page.waitForTimeout(4000);

  if (page.url().includes("/verify-email-address")) {
    await page.getByLabel("Enter verification code").fill("424242");
    await page.getByRole("button", { exact: true, name: "Continue" }).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(4000);
  }

  const body = await page.locator("body").innerText();
  const inputs = await page.locator("input").evaluateAll((els) =>
    els.map((el) => ({
      aria: el.getAttribute("aria-label"),
      name: el.getAttribute("name"),
      type: el.getAttribute("type"),
      value: el.getAttribute("value"),
    })),
  );

  console.log(
    JSON.stringify(
      {
        body,
        email,
        inputs,
        url: page.url(),
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
