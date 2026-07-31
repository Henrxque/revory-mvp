import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const signupForm = read("components/auth/AuthEmailPasswordForm.tsx");
const resetRequestForm = read("components/auth/PasswordResetRequestForm.tsx");
const resetConfirmForm = read("components/auth/PasswordResetConfirmForm.tsx");
const passwordActions = read("src/app/auth/password-actions.ts");
const passwordReset = read("services/auth/password-reset.ts");
const dashboard = read("src/app/(app)/app/dashboard/page.tsx");
const checkout = read("src/app/api/billing/checkout/route.ts");
const home = read("src/app/page.tsx");
const demo = read("src/app/demo/page.tsx");
const start = read("src/app/start/page.tsx");

assert.ok(
  signupForm.includes("Confirm password") &&
    signupForm.includes("password !== passwordConfirmation") &&
    signupForm.includes('data-testid="signup-success"') &&
    signupForm.includes("Account created") &&
    signupForm.includes('role="status"'),
  "Sign-up must confirm the password and replace the form with an accessible persistent success state.",
);
assert.ok(
  passwordActions.includes("passwordConfirmation: string") &&
    passwordActions.includes("input.password !== input.passwordConfirmation") &&
    !passwordActions.includes("passwordConfirmation:" + " await"),
  "Password confirmation must be checked server-side and never persisted.",
);
assert.ok(
  resetRequestForm.includes("Check your inbox") &&
    resetRequestForm.includes("If an email/password REVORY account matches this address") &&
    resetRequestForm.includes("45 minutes") &&
    resetRequestForm.includes('data-testid="password-reset-request-success"'),
  "Reset requests need a durable, enumeration-safe next step with the real expiry.",
);
assert.ok(
  resetConfirmForm.includes("Confirm new password") &&
    resetConfirmForm.includes("password !== passwordConfirmation") &&
    resetConfirmForm.includes("Password updated") &&
    resetConfirmForm.includes('data-testid="password-reset-success"'),
  "Reset confirmation must validate twice and end in a persistent sign-in state.",
);
assert.ok(
  passwordReset.includes("input.password !== input.passwordConfirmation") &&
    passwordReset.includes("This reset link is expired or invalid.") &&
    passwordReset.includes("sessionVersion: { increment: 1 }") &&
    passwordReset.includes("passwordResetTokenHash: null"),
  "The server reset path must reject mismatch, protect invalid links, revoke old sessions and consume the token.",
);
assert.ok(
  dashboard.includes("hasCompletedQuoteRecoveryBaseline") &&
    dashboard.includes("getWorkspaceEntitlements") &&
    dashboard.includes("hasCompletedAudit && !hasActiveSubscription") &&
    dashboard.includes("Your Audit establishes the baseline.") &&
    dashboard.includes("Keep monitoring with Starter — $399/month") &&
    dashboard.includes("Choose Growth — $599/month") &&
    !dashboard.includes("createCheckoutSession"),
  "The post-Audit continuation must be optional, conditional and unable to mutate billing.",
);
assert.ok(
  !checkout.includes("hasCompletedQuoteRecoveryBaseline") &&
    !checkout.includes("baseline-required"),
  "Starter checkout must remain independent from the one-time Audit.",
);

assert.ok(
  home.includes('className="rev-button-primary" href="/start"') &&
    home.includes("Get your Quote Recovery Audit — $399 once") &&
    home.includes('href="/demo"') &&
    home.includes("View the sample audit"),
  "The landing must keep pricing as the primary commercial action and the sample demo as a separate secondary path.",
);
assert.ok(
  demo.includes("AppSidebar") &&
    demo.includes("Cedar Ridge Contractors") &&
    demo.includes("Executive Quote Recovery read") &&
    demo.includes("Quote Recovery opportunities") &&
    demo.includes("Data readiness") &&
    demo.includes("Evidence used for this finding") &&
    demo.includes("File and row") &&
    !demo.includes("Source lineage") &&
    !demo.includes("clinic") &&
    !demo.includes("<form") &&
    !demo.includes("/api/billing/checkout"),
  "The public sample must mirror the contractor product surface, use buyer language and expose no write or checkout action.",
);
for (const contract of [
  "US$399",
  "per month",
  "US$599",
  "paid once",
  "Quote Recovery Audit",
]) {
  assert.ok(home.includes(contract), `Landing pricing must include the explicit contract: ${contract}`);
  assert.ok(start.includes(contract) || ["US$399", "US$599"].includes(contract), `Start pricing must include the explicit contract: ${contract}`);
}
assert.ok(
  home.includes("Choose Growth — $599/month") &&
    !home.includes("Start with Pro") &&
    start.includes('offerKey: "GROWTH"') &&
    !start.includes('offerKey: "FULL_REVENUE_LEAK_AUDIT"') &&
    !home.toLowerCase().includes("per year") &&
    !start.toLowerCase().includes("per year"),
  "All independent monthly and one-time paths must be connected while annual billing remains absent.",
);

console.log("Sprint 15 auth, Audit continuation, commercial CTA, product-faithful demo and pricing hierarchy contract: PASS");
