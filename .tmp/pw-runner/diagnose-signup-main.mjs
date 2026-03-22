import fs from "node:fs";
import { chromium } from "playwright";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";

const keyless = JSON.parse(fs.readFileSync(".clerk/.tmp/keyless.json", "utf8"));
process.env.CLERK_PUBLISHABLE_KEY = keyless.publishableKey;
process.env.CLERK_SECRET_KEY = keyless.secretKey;
await clerkSetup({ publishableKey: keyless.publishableKey, secretKey: keyless.secretKey });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: {
    height: 900,
    width: 1440,
  },
});
const page = await context.newPage();
const email = `revory-diagnose-${Date.now()}+clerk_test@example.com`;

try {
  await page.goto("http://127.0.0.1:3300/", { waitUntil: "networkidle" });
  await setupClerkTestingToken({
    page,
    options: {
      frontendApiUrl: "touched-albacore-54.clerk.accounts.dev",
    },
  });

  await page.goto("http://127.0.0.1:3300/sign-up", { waitUntil: "networkidle" });
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill("Revory!12345");
  await page.getByRole("button", { exact: true, name: "Continue" }).click();
  await page.waitForURL(/\/sign-up\/verify-email-address/, { timeout: 60000 });
  const inputsBefore = await page.locator("input").evaluateAll((elements) =>
    elements.map((element) => ({
      ariaLabel: element.getAttribute("aria-label"),
      inputMode: element.getAttribute("inputmode"),
      name: element.getAttribute("name"),
      placeholder: element.getAttribute("placeholder"),
      type: element.getAttribute("type"),
      value: element.getAttribute("value"),
    })),
  );

  const data = await page.evaluate(() => ({
    pathname: window.location.pathname,
    search: window.location.search,
  }));

  console.log(
    JSON.stringify(
      {
        body: await page.locator("body").innerText(),
        data,
        inputsBefore,
        url: page.url(),
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
