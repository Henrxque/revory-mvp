import fs from "node:fs";
import { chromium } from "playwright";
import { createClerkClient } from "@clerk/backend";

const keyless = JSON.parse(fs.readFileSync(".clerk/.tmp/keyless.json", "utf8"));
const clerkClient = createClerkClient({ secretKey: keyless.secretKey });

const email = `revory-cookie-${Date.now()}+clerk_test@example.com`;
const user = await clerkClient.users.createUser({
  emailAddress: [email],
  firstName: "Cookie",
  lastName: "QA",
  password: "Revory!12345",
  skipPasswordChecks: true,
});
const session = await clerkClient.sessions.createSession({ userId: user.id });
const token = await clerkClient.sessions.getToken(session.id);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
await context.addCookies([
  {
    domain: "127.0.0.1",
    expires: Math.floor(Date.now() / 1000) + 3600,
    httpOnly: false,
    name: "__session",
    path: "/",
    sameSite: "Lax",
    secure: false,
    value: token.jwt,
  },
]);
const page = await context.newPage();

try {
  await page.goto("http://127.0.0.1:3000/app", { waitUntil: "networkidle" });
  console.log(
    JSON.stringify(
      {
        cookieNames: (await context.cookies()).map((cookie) => cookie.name),
        h1: await page.locator("h1, h2").first().textContent().catch(() => null),
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
