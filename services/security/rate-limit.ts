import "server-only";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitInput = Readonly<{
  key: string;
  limit: number;
  windowMs: number;
}>;

const buckets = new Map<string, RateLimitBucket>();

function cleanupExpiredBuckets(now: number) {
  if (buckets.size < 500) {
    return;
  }

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function checkRateLimit({ key, limit, windowMs }: RateLimitInput) {
  const now = Date.now();
  const normalizedKey = key.trim().toLowerCase();
  const bucket = buckets.get(normalizedKey);

  cleanupExpiredBuckets(now);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(normalizedKey, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      limited: false,
      remaining: Math.max(0, limit - 1),
      resetAt: now + windowMs,
    };
  }

  if (bucket.count >= limit) {
    return {
      limited: true,
      remaining: 0,
      resetAt: bucket.resetAt,
    };
  }

  bucket.count += 1;

  return {
    limited: false,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}
