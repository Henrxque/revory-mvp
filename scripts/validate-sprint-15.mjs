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
    dashboard.includes("hasCompletedAudit && !hasActiveStarter") &&
    dashboard.includes("Your Audit establishes the baseline.") &&
    dashboard.includes("Starter keeps this review current with refreshed imports and movement over time.") &&
    dashboard.includes("US$399/month after the completed Audit.") &&
    dashboard.includes("does not change your access or billing") &&
    !dashboard.includes("createCheckoutSession"),
  "The post-Audit continuation must be accurate, conditional and unable to mutate billing.",
);
assert.match(
  checkout,
  /offerKey === "STARTER" && !\(await hasCompletedQuoteRecoveryBaseline\(workspace\.id\)\)/,
  "Starter checkout must retain the completed-Audit server guard.",
);

console.log("Sprint 15 auth confidence, enumeration safety and gated Audit continuation contract: PASS");
