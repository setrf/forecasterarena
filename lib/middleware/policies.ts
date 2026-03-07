export interface RateLimitPolicy {
  bucket: 'login' | 'cron' | 'admin';
  limit: number;
  windowMs: number;
  limitedMessage: string;
  limitedHeaders?: Record<string, string>;
  successHeaders?: (remaining: number) => Record<string, string>;
}

const ONE_MINUTE_MS = 60 * 1000;

const loginPolicy: RateLimitPolicy = {
  bucket: 'login',
  limit: 5,
  windowMs: ONE_MINUTE_MS,
  limitedMessage: 'Too many login attempts. Please try again later.',
  limitedHeaders: {
    'Retry-After': '60',
    'X-RateLimit-Limit': '5',
    'X-RateLimit-Remaining': '0'
  },
  successHeaders: (remaining) => ({
    'X-RateLimit-Limit': '5',
    'X-RateLimit-Remaining': String(remaining)
  })
};

const cronPolicy: RateLimitPolicy = {
  bucket: 'cron',
  limit: 10,
  windowMs: ONE_MINUTE_MS,
  limitedMessage: 'Too many requests. Please try again later.',
  limitedHeaders: {
    'Retry-After': '60'
  }
};

const adminPolicy: RateLimitPolicy = {
  bucket: 'admin',
  limit: 30,
  windowMs: ONE_MINUTE_MS,
  limitedMessage: 'Too many requests. Please try again later.'
};

export function matchRateLimitPolicy(
  path: string,
  method: string
): RateLimitPolicy | null {
  if (path === '/api/admin/login' && method === 'POST') {
    return loginPolicy;
  }

  if (path.startsWith('/api/cron/') && method === 'POST') {
    return cronPolicy;
  }

  if (path.startsWith('/api/admin/') && path !== '/api/admin/login') {
    return adminPolicy;
  }

  return null;
}
