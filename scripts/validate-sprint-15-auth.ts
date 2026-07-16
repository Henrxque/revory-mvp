import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { prisma } from "../db/prisma";
import { hashPassword, verifyPassword } from "../services/auth/password-crypto";
import { resetPasswordWithToken } from "../services/auth/password-reset";
import { createEmailPasswordAccount } from "../src/app/auth/password-actions";

const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const email = `sprint-15-${runId}@example.invalid`;
const tokens = {
  expired: `expired-${runId}`,
  rateLimited: `rate-limited-${runId}`,
  valid: `valid-${runId}`,
};

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function rateLimitKey(token: string) {
  const key = `password-reset-token:${tokenHash(token)}`;
  return createHash("sha256")
    .update(`revory-rate-limit:${key.trim().toLowerCase()}`)
    .digest("hex");
}

const originalPassword = "Original-Password-15";
const updatedPassword = "Updated-Password-15";
let userId: string | null = null;

try {
  const signupMismatch = await createEmailPasswordAccount({
    email,
    fullName: "Sprint 15 QA",
    password: originalPassword,
    passwordConfirmation: "Different-Password-15",
  });
  assert.equal(signupMismatch.ok, false);
  assert.equal(signupMismatch.message, "Passwords do not match.");
  assert.equal(await prisma.user.count({ where: { email } }), 0, "A mismatched sign-up must not create a user.");

  const originalHash = await hashPassword(originalPassword);
  const user = await prisma.user.create({
    data: {
      authProvider: "credentials",
      authSubject: `sprint-15-${runId}`,
      email,
      emailVerifiedAt: new Date(),
      fullName: "Sprint 15 QA",
      passwordHash: originalHash,
      passwordResetExpiresAt: new Date(Date.now() + 45 * 60 * 1000),
      passwordResetTokenHash: tokenHash(tokens.valid),
      status: "ACTIVE",
    },
  });
  userId = user.id;

  const mismatch = await resetPasswordWithToken({
    password: updatedPassword,
    passwordConfirmation: "Different-Password-15",
    token: tokens.valid,
  });
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.message, "Passwords do not match.");
  const afterMismatch = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  assert.equal(afterMismatch.passwordResetTokenHash, tokenHash(tokens.valid), "Mismatch must not consume the token.");
  assert.equal(await verifyPassword(originalPassword, afterMismatch.passwordHash ?? ""), true);

  const weak = await resetPasswordWithToken({
    password: "short",
    passwordConfirmation: "short",
    token: tokens.valid,
  });
  assert.equal(weak.ok, false);
  assert.equal(weak.message, "Use at least 10 characters for the new password.");

  const success = await resetPasswordWithToken({
    password: updatedPassword,
    passwordConfirmation: updatedPassword,
    token: tokens.valid,
  });
  assert.equal(success.ok, true);
  const afterSuccess = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  assert.equal(afterSuccess.passwordResetTokenHash, null, "A successful reset must consume the token.");
  assert.equal(afterSuccess.passwordResetExpiresAt, null);
  assert.equal(afterSuccess.sessionVersion, user.sessionVersion + 1, "A successful reset must revoke older sessions.");
  assert.equal(await verifyPassword(updatedPassword, afterSuccess.passwordHash ?? ""), true);

  const replay = await resetPasswordWithToken({
    password: "Replay-Password-15",
    passwordConfirmation: "Replay-Password-15",
    token: tokens.valid,
  });
  assert.equal(replay.ok, false);
  assert.equal(replay.message, "This reset link is expired or invalid.");

  await prisma.user.update({
    data: {
      passwordResetExpiresAt: new Date(Date.now() - 1_000),
      passwordResetTokenHash: tokenHash(tokens.expired),
    },
    where: { id: user.id },
  });
  const expired = await resetPasswordWithToken({
    password: "Expired-Password-15",
    passwordConfirmation: "Expired-Password-15",
    token: tokens.expired,
  });
  assert.equal(expired.ok, false);
  assert.equal(expired.message, "This reset link is expired or invalid.");

  let rateLimitedResult: Awaited<ReturnType<typeof resetPasswordWithToken>> | null = null;
  for (let attempt = 0; attempt < 11; attempt += 1) {
    rateLimitedResult = await resetPasswordWithToken({
      password: "Rate-Limit-Password-15",
      passwordConfirmation: "Rate-Limit-Password-15",
      token: tokens.rateLimited,
    });
  }
  assert.equal(rateLimitedResult?.ok, false);
  assert.equal(rateLimitedResult?.message, "Too many reset attempts. Wait a few minutes before trying again.");

  console.log("Sprint 15 reset mismatch, strength, success, replay, expiry and rate limit: PASS");
} finally {
  if (userId) {
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  await prisma.authRateLimitBucket.deleteMany({
    where: {
      key: {
        in: Object.values(tokens).map(rateLimitKey),
      },
    },
  });
  await prisma.$disconnect();
}
