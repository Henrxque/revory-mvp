import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const secretPatterns = [
  ["Google OAuth client secret", /GOCSPX-[A-Za-z0-9_-]{10,}/g],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{20,}/g],
  ["OpenAI API key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}/g],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ["Resend API key", /\bre_[A-Za-z0-9]{20,}/g],
  ["Stripe secret", /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/g],
  ["webhook signing secret", /\bwhsec_[A-Za-z0-9]{16,}/g],
];

const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
assert.ok(
  !tracked.some((file) => /(^|\/)\.env(?:\..+)?$/.test(file) && !file.endsWith(".env.example")),
  "A non-example environment file is tracked by git.",
);

const textExtensions = /\.(?:css|html|js|json|jsx|md|mjs|prisma|sql|ts|tsx|txt|yaml|yml)$/i;
const currentText = tracked
  .filter((file) => textExtensions.test(file))
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");
const historyText = execFileSync("git", ["log", "--all", "-p", "--no-ext-diff", "--unified=0"], {
  encoding: "utf8",
  maxBuffer: 96 * 1024 * 1024,
});

const currentFindings = [];
const historyFindings = [];
for (const [label, pattern] of secretPatterns) {
  pattern.lastIndex = 0;
  if (pattern.test(currentText)) currentFindings.push(label);
  pattern.lastIndex = 0;
  if (pattern.test(historyText)) historyFindings.push(label);
}

assert.deepEqual(currentFindings, [], `Potential tracked secrets detected by category: ${currentFindings.join(", ")}`);
assert.deepEqual(historyFindings, [], `Potential historical secrets detected by category: ${historyFindings.join(", ")}`);

const config = fs.readFileSync("next.config.ts", "utf8");
for (const required of [
  "Content-Security-Policy",
  "frame-ancestors 'none'",
  "Permissions-Policy",
  "Referrer-Policy",
  "Strict-Transport-Security",
  "X-Content-Type-Options",
  "X-Frame-Options",
  "poweredByHeader: false",
]) {
  assert.ok(config.includes(required), `Missing security-header contract: ${required}`);
}

console.log("Sprint 14 tracked/history secret scan and security-header contract: PASS");
