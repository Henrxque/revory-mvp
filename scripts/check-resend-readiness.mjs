import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const fileArgument = process.argv.find((argument) => argument.startsWith("--file="));
const remote = process.argv.includes("--remote");
const requestedFile = fileArgument?.slice("--file=".length);

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const values = {};

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    values[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }

  return values;
}

const standardFiles = [".env", ".env.local"];
const files = requestedFile ? [requestedFile] : standardFiles;
const values = Object.assign(
  {},
  ...files.map((file) => readEnvFile(path.resolve(cwd, file))),
  process.env,
);
const apiKey = values.RESEND_API_KEY?.trim() ?? "";
const from = values.AUTH_EMAIL_FROM?.trim() ?? "";
const webhookSecret = values.RESEND_WEBHOOK_SECRET?.trim() ?? "";
const address = (from.match(/<([^<>]+)>/)?.[1] ?? from).trim().toLowerCase();
const domain = address.includes("@") ? address.split("@").at(-1) : "";
const problems = [];

if (!apiKey.startsWith("re_") || /^(replace|your-|example|changeme)/i.test(apiKey)) {
  problems.push("RESEND_API_KEY is missing or is still a placeholder.");
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) || /your-domain|example/i.test(address)) {
  problems.push("AUTH_EMAIL_FROM must use an address on the verified sending domain.");
}
if (!webhookSecret.startsWith("whsec_")) {
  problems.push("RESEND_WEBHOOK_SECRET is missing; delivery-event verification is not ready.");
}

console.log("[revory-email] Resend readiness check");
console.log(`[revory-email] Source: ${files.join(", ")}`);
console.log(`[revory-email] API key: ${apiKey.startsWith("re_") ? "configured" : "missing/invalid"}`);
console.log(`[revory-email] Sender domain: ${domain || "missing/invalid"}`);
console.log(`[revory-email] Webhook secret: ${webhookSecret.startsWith("whsec_") ? "configured" : "missing/invalid"}`);

if (remote && problems.length === 0) {
  try {
    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      problems.push(`Resend API rejected the credential (HTTP ${response.status}).`);
    } else {
      const matchingDomain = Array.isArray(body?.data)
        ? body.data.find((entry) => entry?.name === domain || domain.endsWith(`.${entry?.name}`))
        : null;
      console.log(`[revory-email] Remote domain status: ${matchingDomain?.status ?? "not found"}`);
      if (matchingDomain?.status !== "verified") {
        problems.push(`The sender domain is not verified in Resend (status: ${matchingDomain?.status ?? "not found"}).`);
      }
    }
  } catch {
    problems.push("Resend API could not be reached for the remote check.");
  }
}

for (const problem of problems) console.error(`[revory-email] ${problem}`);
if (problems.length === 0) console.log("[revory-email] Configuration is ready for an explicit delivery smoke test.");
process.exitCode = problems.length === 0 ? 0 : 1;
