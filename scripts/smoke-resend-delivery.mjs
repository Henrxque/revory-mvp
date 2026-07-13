import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const values = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match) values[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return values;
}

const cwd = process.cwd();
const values = Object.assign(
  {},
  readEnvFile(path.join(cwd, ".env")),
  readEnvFile(path.join(cwd, ".env.local")),
  process.env,
);
const apiKey = values.RESEND_API_KEY?.trim() ?? "";
const from = values.AUTH_EMAIL_FROM?.trim() ?? "";
const to = values.RESEND_SMOKE_TO?.trim() ?? "";

if (!apiKey.startsWith("re_") || !from || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
  console.error("[revory-email] Set real RESEND_API_KEY, AUTH_EMAIL_FROM and RESEND_SMOKE_TO before running the delivery smoke test.");
  process.exit(1);
}

const day = new Date().toISOString().slice(0, 10);
const recipientDigest = createHash("sha256").update(to).digest("hex").slice(0, 16);
const response = await fetch("https://api.resend.com/emails", {
  body: JSON.stringify({
    from,
    html: "<p>REVORY transactional email delivery is configured correctly.</p>",
    subject: "REVORY email delivery smoke test",
    text: "REVORY transactional email delivery is configured correctly.",
    to,
  }),
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "Idempotency-Key": `revory/resend-smoke/${day}/${recipientDigest}`,
  },
  method: "POST",
  signal: AbortSignal.timeout(10_000),
});

if (!response.ok) {
  console.error(`[revory-email] Delivery smoke test failed (HTTP ${response.status}).`);
  process.exit(1);
}

const payload = await response.json().catch(() => null);
console.log(`[revory-email] Delivery accepted by Resend. Provider id: ${payload?.id ?? "not returned"}`);
