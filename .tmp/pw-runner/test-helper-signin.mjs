import fs from "node:fs";
import { chromium } from "playwright";
import { clerk, clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { createClerkClient } from "@clerk/backend";

const root = "C:/Users/hriqu/Documents/revory-mvp";
const keyless = JSON.parse(fs.readFileSync(`${root}/.clerk/.tmp/keyless.json`, "utf8"));
process.env.CLERK_PUBLISHABLE_KEY = keyless.publishableKey;
process.env.CLERK_SECRET_KEY = keyless.secretKey;
await clerkSetup({ publishableKey: keyless.publishableKey, secretKey: keyless.secretKey });

const email = `revory-qa-${Date.now()}+clerk_test@example.com`;
const backend = createClerkClient({ secretKey: keyless.secretKey });
const user = await backend.users.createUser({
  emailAddress: [email],
  firstName: "Revory",
  lastName: "QA",
  password: "Revory!12345",
  skipPasswordChecks: true,
  skipPasswordRequirement: false,
});

const browser = await chromium.launch({
  executablePath:
    "C:/Users/hriqu/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe",
  headless: true,
});
const page = await browser.newPage();

try {
  await page.goto("http://127.0.0.1:3000/");
  await setupClerkTestingToken({
    page,
    options: {
      frontendApiUrl: "touched-albacore-54.clerk.accounts.dev",
    },
  });
  await page.waitForTimeout(2000);
  const before = await page.evaluate(() => ({
    hasClerk: !!window.Clerk,
    loaded: !!window.Clerk?.loaded,
    user: window.Clerk?.user?.primaryEmailAddress?.emailAddress ?? null,
  }));
  await clerk.signIn({ page, emailAddress: email });
  await page.goto("http://127.0.0.1:3000/app", { waitUntil: "networkidle" });
  const after = await page.evaluate(() => ({
    hasClerk: !!window.Clerk,
    loaded: !!window.Clerk?.loaded,
    user: window.Clerk?.user?.primaryEmailAddress?.emailAddress ?? null,
  }));
  console.log(JSON.stringify({ before, after, url: page.url(), userId: user.id }, null, 2));
} finally {
  await browser.close();
}
