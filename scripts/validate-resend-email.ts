import assert from "node:assert/strict";

import {
  createEmailIdempotencyKey,
  getTransactionalEmailConfig,
  sendTransactionalEmail,
} from "@/services/email/transactional-email";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.RESEND_API_KEY;
const originalFrom = process.env.AUTH_EMAIL_FROM;
const originalTimeout = process.env.RESEND_TIMEOUT_MS;

try {
  process.env.RESEND_API_KEY = "REPLACE_WITH_RESEND_API_KEY";
  process.env.AUTH_EMAIL_FROM = "REVORY <no-reply@revory.app>";
  assert.equal(getTransactionalEmailConfig().configured, false);
  assert.ok(getTransactionalEmailConfig().issues.includes("RESEND_API_KEY_INVALID"));

  process.env.RESEND_API_KEY = "re_local_validation_key";
  process.env.AUTH_EMAIL_FROM = "REVORY <no-reply@revory.app>";
  process.env.RESEND_TIMEOUT_MS = "8000";
  assert.equal(getTransactionalEmailConfig().configured, true);

  const keyA = createEmailIdempotencyKey("test", "same-event");
  const keyB = createEmailIdempotencyKey("test", "same-event");
  const keyC = createEmailIdempotencyKey("test", "different-event");
  assert.equal(keyA, keyB);
  assert.notEqual(keyA, keyC);
  assert.ok(keyA.length <= 256);

  let requestCount = 0;
  let capturedHeaders: Headers | undefined;
  globalThis.fetch = (async (_input, init) => {
    requestCount += 1;
    capturedHeaders = new Headers(init?.headers);
    return new Response(JSON.stringify({ id: "email_test_123" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }) as typeof fetch;

  const invalidRecipient = await sendTransactionalEmail({
    html: "<p>test</p>",
    idempotencyKey: keyA,
    subject: "Test",
    text: "test",
    to: "invalid-recipient",
  });
  assert.deepEqual(invalidRecipient, { reason: "INVALID_RECIPIENT", sent: false });
  assert.equal(requestCount, 0);

  const delivered = await sendTransactionalEmail({
    html: "<p>test</p>",
    idempotencyKey: keyA,
    subject: "Test",
    text: "test",
    to: "owner@revory.app",
  });
  assert.deepEqual(delivered, {
    providerId: "email_test_123",
    reason: null,
    sent: true,
  });
  assert.equal(requestCount, 1);
  assert.equal(capturedHeaders?.get("Idempotency-Key"), keyA);
  assert.equal(capturedHeaders?.get("Authorization"), "Bearer re_local_validation_key");

  let retryRequestCount = 0;
  globalThis.fetch = (async () => {
    retryRequestCount += 1;
    if (retryRequestCount === 1) return new Response(null, { status: 503 });
    return new Response(JSON.stringify({ id: "email_after_retry" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }) as typeof fetch;
  const retriedDelivery = await sendTransactionalEmail({
    html: "<p>retry</p>",
    idempotencyKey: keyC,
    subject: "Retry test",
    text: "retry",
    to: "owner@revory.app",
  });
  assert.equal(retriedDelivery.sent, true);
  assert.equal(retryRequestCount, 2);

  console.log("[revory-email] Transactional email validation passed.");
} finally {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = originalApiKey;
  if (originalFrom === undefined) delete process.env.AUTH_EMAIL_FROM;
  else process.env.AUTH_EMAIL_FROM = originalFrom;
  if (originalTimeout === undefined) delete process.env.RESEND_TIMEOUT_MS;
  else process.env.RESEND_TIMEOUT_MS = originalTimeout;
}
