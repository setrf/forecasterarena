interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitStatus {
  limited: boolean;
  remaining: number;
}

const rateLimits = new Map<string, RateLimitEntry>();
let cleanupTimer: NodeJS.Timeout | null = null;

function cleanupExpiredEntries(now: number): void {
  rateLimits.forEach((entry, key) => {
    if (entry.resetAt < now) {
      rateLimits.delete(key);
    }
  });
}

function ensureCleanupInterval(): void {
  if (cleanupTimer) {
    return;
  }

  cleanupTimer = setInterval(() => {
    cleanupExpiredEntries(Date.now());
  }, 5 * 60 * 1000);
}

export function applyRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): RateLimitStatus {
  ensureCleanupInterval();

  const entry = rateLimits.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return {
      limited: false,
      remaining: Math.max(0, limit - 1)
    };
  }

  entry.count += 1;
  return {
    limited: entry.count > limit,
    remaining: Math.max(0, limit - entry.count)
  };
}

export function resetRateLimitStore(): void {
  rateLimits.clear();

  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
