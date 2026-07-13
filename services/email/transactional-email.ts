import "server-only";

import { createHash } from "node:crypto";

const RESEND_EMAIL_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_TIMEOUT_MS = 8_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 2;
const RETRYABLE_PROVIDER_STATUSES = new Set([429, 500, 502, 503, 504]);

type PasswordResetEmailInput = Readonly<{
  email: string;
  resetUrl: string;
}>;

type EmailVerificationInput = Readonly<{
  email: string;
  verificationUrl: string;
}>;

type TransactionalEmailInput = Readonly<{
  html: string;
  idempotencyKey: string;
  subject: string;
  text: string;
  to: string;
}>;

export type TransactionalEmailResult = Readonly<{
  providerId?: string;
  reason:
    | "EMAIL_NOT_CONFIGURED"
    | "INVALID_RECIPIENT"
    | "NETWORK_ERROR"
    | "PROVIDER_ERROR"
    | "TIMEOUT"
    | null;
  sent: boolean;
}>;

function isPlaceholder(value: string) {
  return /(^replace|^your-|your-domain|example\.|changeme)/i.test(value);
}

function extractEmailAddress(value: string) {
  const angleAddress = value.match(/<([^<>]+)>/);

  return (angleAddress?.[1] ?? value).trim().toLowerCase();
}

function isEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getTimeoutMs() {
  const rawValue = process.env.RESEND_TIMEOUT_MS?.trim();
  const configured = Number(rawValue);

  if (!rawValue || !Number.isFinite(configured)) {
    return DEFAULT_TIMEOUT_MS;
  }

  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, Math.round(configured)));
}

export function escapeEmailHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function brandedEmail(input: {
  actionLabel: string;
  actionUrl: string;
  intro: string;
  title: string;
}) {
  const actionUrl = escapeEmailHtml(input.actionUrl);

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#141516;color:#f5f7f6;font-family:'DM Sans',Arial,sans-serif;">
    <div style="padding:32px 16px;">
      <div style="margin:0 auto;max-width:560px;border:1px solid rgba(67,179,155,.28);border-radius:20px;background:#1a1c1e;padding:32px;">
        <p style="margin:0 0 24px;color:#43B39B;font-size:13px;font-weight:700;letter-spacing:.16em;">REVORY</p>
        <h1 style="margin:0 0 16px;font-size:28px;line-height:1.15;">${escapeEmailHtml(input.title)}</h1>
        <p style="margin:0 0 24px;color:#b8c1bf;font-size:16px;line-height:1.65;">${escapeEmailHtml(input.intro)}</p>
        <a href="${actionUrl}" style="display:inline-block;border-radius:999px;background:#43B39B;color:#101413;padding:13px 20px;text-decoration:none;font-weight:700;">${escapeEmailHtml(input.actionLabel)}</a>
        <p style="margin:24px 0 0;color:#7f8b88;font-size:12px;line-height:1.6;">If the button does not open, copy this address into your browser:<br><a href="${actionUrl}" style="color:#8bd1c2;word-break:break-all;">${actionUrl}</a></p>
      </div>
    </div>
  </body>
</html>`;
}

export function createEmailIdempotencyKey(scope: string, uniqueValue: string) {
  const digest = createHash("sha256").update(uniqueValue).digest("hex");

  return `revory/${scope}/${digest}`;
}

export function getTransactionalEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  const from = process.env.AUTH_EMAIL_FROM?.trim() ?? "";
  const issues: string[] = [];

  if (!apiKey) {
    issues.push("RESEND_API_KEY_MISSING");
  } else if (isPlaceholder(apiKey) || !apiKey.startsWith("re_")) {
    issues.push("RESEND_API_KEY_INVALID");
  }

  const fromAddress = extractEmailAddress(from);
  if (!from) {
    issues.push("AUTH_EMAIL_FROM_MISSING");
  } else if (isPlaceholder(fromAddress) || !isEmailAddress(fromAddress)) {
    issues.push("AUTH_EMAIL_FROM_INVALID");
  }

  return {
    apiKey,
    configured: issues.length === 0,
    from,
    fromAddress,
    issues,
    timeoutMs: getTimeoutMs(),
  };
}

export async function sendTransactionalEmail(
  input: TransactionalEmailInput,
): Promise<TransactionalEmailResult> {
  const config = getTransactionalEmailConfig();

  if (!config.configured) {
    return { reason: "EMAIL_NOT_CONFIGURED", sent: false };
  }

  if (!isEmailAddress(input.to.trim().toLowerCase())) {
    return { reason: "INVALID_RECIPIENT", sent: false };
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(RESEND_EMAIL_ENDPOINT, {
        body: JSON.stringify({
          from: config.from,
          html: input.html,
          subject: input.subject,
          text: input.text,
          to: input.to,
        }),
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
        method: "POST",
        signal: controller.signal,
      });

      if (response.ok) {
        const payload = (await response.json().catch(() => null)) as { id?: unknown } | null;
        const providerId = typeof payload?.id === "string" ? payload.id : undefined;

        return { providerId, reason: null, sent: true };
      }

      if (RETRYABLE_PROVIDER_STATUSES.has(response.status) && attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
        continue;
      }

      console.error("[revory-email] provider request failed", {
        status: response.status,
      });

      return { reason: "PROVIDER_ERROR", sent: false };
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "AbortError";

      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
        continue;
      }

      console.error("[revory-email] provider request unavailable", {
        reason: timedOut ? "timeout" : "network_error",
      });

      return {
        reason: timedOut ? "TIMEOUT" : "NETWORK_ERROR",
        sent: false,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  return { reason: "PROVIDER_ERROR", sent: false };
}

export async function sendPasswordResetEmail({
  email,
  resetUrl,
}: PasswordResetEmailInput) {
  const result = await sendTransactionalEmail({
    html: brandedEmail({
      actionLabel: "Reset password",
      actionUrl: resetUrl,
      intro: "Use this secure link to choose a new password. The link expires in 45 minutes. If you did not request it, you can ignore this email.",
      title: "Reset your REVORY password",
    }),
    idempotencyKey: createEmailIdempotencyKey("password-reset", `${email}:${resetUrl}`),
    subject: "Reset your REVORY password",
    text: `Reset your REVORY password: ${resetUrl}\n\nThis link expires in 45 minutes. If you did not request it, ignore this email.`,
    to: email,
  });

  return result.sent;
}

export async function sendEmailVerificationEmail({
  email,
  verificationUrl,
}: EmailVerificationInput) {
  const result = await sendTransactionalEmail({
    html: brandedEmail({
      actionLabel: "Confirm email",
      actionUrl: verificationUrl,
      intro: "Confirm this address to finish the secure email and password setup for your REVORY account. The link expires in 24 hours.",
      title: "Confirm your REVORY account",
    }),
    idempotencyKey: createEmailIdempotencyKey(
      "email-verification",
      `${email}:${verificationUrl}`,
    ),
    subject: "Confirm your REVORY account",
    text: `Confirm your REVORY account: ${verificationUrl}\n\nThis link expires in 24 hours. If you did not create this account, ignore this email.`,
    to: email,
  });

  return result.sent;
}
