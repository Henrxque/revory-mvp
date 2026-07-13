import "server-only";

import { createHash } from "node:crypto";

import { prisma } from "@/db/prisma";

const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 30 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function keyFor(email: string, ipAddress: string) {
  return createHash("sha256").update(`${email.trim().toLowerCase()}|${ipAddress}`).digest("hex");
}

export async function checkDurableAuthRateLimit(email: string, ipAddress: string) {
  const key = keyFor(email, ipAddress);
  const bucket = await prisma.authRateLimitBucket.findUnique({ where: { key } });
  return { blocked: Boolean(bucket?.blockedUntil && bucket.blockedUntil > new Date()), key };
}

export async function recordAuthAttempt(key: string, succeeded: boolean) {
  if (succeeded) {
    await prisma.authRateLimitBucket.deleteMany({ where: { key } });
    return;
  }
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const current = await tx.authRateLimitBucket.findUnique({ where: { key } });
    const expired = !current || now.valueOf() - current.windowStartedAt.valueOf() >= WINDOW_MS;
    const attemptCount = expired ? 1 : current.attemptCount + 1;
    await tx.authRateLimitBucket.upsert({
      where: { key },
      create: { key, attemptCount, windowStartedAt: now, blockedUntil: attemptCount >= MAX_ATTEMPTS ? new Date(now.valueOf() + BLOCK_MS) : null },
      update: { attemptCount, windowStartedAt: expired ? now : current?.windowStartedAt ?? now, blockedUntil: attemptCount >= MAX_ATTEMPTS ? new Date(now.valueOf() + BLOCK_MS) : current?.blockedUntil ?? null },
    });
  });
}
