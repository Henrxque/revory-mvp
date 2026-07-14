import "server-only";

import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/db/prisma";

type RateLimitInput = Readonly<{
  key: string;
  limit: number;
  windowMs: number;
}>;

const SERIALIZATION_RETRIES = 3;

function durableKey(value: string) {
  return createHash("sha256")
    .update(`revory-rate-limit:${value.trim().toLowerCase()}`)
    .digest("hex");
}

export async function checkRateLimit({ key, limit, windowMs }: RateLimitInput) {
  const normalizedLimit = Math.max(1, Math.floor(limit));
  const normalizedWindowMs = Math.max(1_000, Math.floor(windowMs));
  const bucketKey = durableKey(key);

  for (let attempt = 1; attempt <= SERIALIZATION_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const now = new Date();
        const current = await tx.authRateLimitBucket.findUnique({
          where: { key: bucketKey },
        });
        const expired =
          !current ||
          now.valueOf() - current.windowStartedAt.valueOf() >= normalizedWindowMs;
        const attemptCount = expired ? 1 : current.attemptCount + 1;
        const windowStartedAt = expired ? now : current.windowStartedAt;

        await tx.authRateLimitBucket.upsert({
          where: { key: bucketKey },
          create: {
            attemptCount,
            key: bucketKey,
            windowStartedAt,
          },
          update: {
            attemptCount,
            blockedUntil: null,
            windowStartedAt,
          },
        });

        return {
          limited: attemptCount > normalizedLimit,
          remaining: Math.max(0, normalizedLimit - attemptCount),
          resetAt: windowStartedAt.valueOf() + normalizedWindowMs,
        };
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";

      if (!retryable || attempt === SERIALIZATION_RETRIES) {
        throw error;
      }
    }
  }

  throw new Error("Rate limit state could not be persisted.");
}
