import { afterEach, describe, expect, it } from 'vitest';
import { createAdminSessionToken } from '@/lib/auth/adminSession';
import { getClientIp, getRateLimitKey } from '@/lib/middleware/ip';
import { matchRateLimitPolicy } from '@/lib/middleware/policies';
import { resetRateLimitStore } from '@/lib/middleware/rateLimit';
import { middleware } from '@/middleware';

afterEach(() => {
  resetRateLimitStore();
});

describe('middleware helpers', () => {
  it('prefers Cloudflare, then x-real-ip, then forwarded-for, then unknown', () => {
    expect(getClientIp(new Headers({
      'cf-connecting-ip': '1.1.1.1',
      'x-real-ip': '2.2.2.2',
      'x-forwarded-for': '3.3.3.3, 4.4.4.4'
    }))).toBe('1.1.1.1');

    expect(getClientIp(new Headers({
      'x-real-ip': '2.2.2.2',
      'x-forwarded-for': '3.3.3.3, 4.4.4.4'
    }))).toBe('2.2.2.2');

    expect(getClientIp(new Headers({
      'x-forwarded-for': '3.3.3.3, 4.4.4.4'
    }))).toBe('3.3.3.3');

    expect(getClientIp(new Headers())).toBe('unknown');
  });

  it('builds stable rate-limit keys and matches the expected policies', () => {
    expect(getRateLimitKey(new Headers({ 'x-real-ip': '9.9.9.9' }), 'login')).toBe('9.9.9.9:login');
    expect(matchRateLimitPolicy('/api/admin/login', 'POST')?.bucket).toBe('login');
    expect(matchRateLimitPolicy('/api/cron/run-decisions', 'POST')?.bucket).toBe('cron');
    expect(matchRateLimitPolicy('/api/admin/stats', 'GET')?.bucket).toBe('admin');
    expect(matchRateLimitPolicy('/api/cron/run-decisions', 'GET')).toBeNull();
  });
});

describe('middleware', () => {
  it('adds login rate-limit headers and blocks the sixth login attempt', async () => {
    const request = createRequest('/api/admin/login', 'POST', {
      'x-real-ip': '10.0.0.1'
    });

    const first = await middleware(request);
    expect(first.status).toBe(200);
    expect(first.headers.get('X-RateLimit-Limit')).toBe('5');
    expect(first.headers.get('X-RateLimit-Remaining')).toBe('4');

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await middleware(request);
    }

    const blocked = await middleware(request);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBe('60');
    expect(blocked.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('blocks cron posts after the tenth request but ignores non-post cron requests', async () => {
    const postRequest = createRequest('/api/cron/run-decisions', 'POST', {
      'x-real-ip': '10.0.0.2'
    });

    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await middleware(postRequest)).status).toBe(200);
    }

    const blocked = await middleware(postRequest);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBe('60');

    const getRequest = createRequest('/api/cron/run-decisions', 'GET', {
      'x-real-ip': '10.0.0.2'
    });
    expect((await middleware(getRequest)).status).toBe(200);
  });

  it('blocks admin api requests after the thirtieth request', async () => {
    const request = createRequest('/api/admin/stats', 'GET', {
      'x-real-ip': '10.0.0.3'
    });

    for (let attempt = 0; attempt < 30; attempt += 1) {
      expect((await middleware(request)).status).toBe(200);
    }

    const blocked = await middleware(request);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('content-type')).toContain('application/json');
  });

  it('skips admin api rate limiting for authenticated admin sessions', async () => {
    const token = createAdminSessionToken('admin');
    const request = createRequest(
      '/api/admin/costs',
      'GET',
      {
        'x-real-ip': '10.0.0.4',
        cookie: `forecaster_admin=${token}`
      },
      {
        cookieValue: token
      }
    );

    for (let attempt = 0; attempt < 40; attempt += 1) {
      expect((await middleware(request)).status).toBe(200);
    }
  });
});

function createRequest(
  pathname: string,
  method: string,
  headers: Record<string, string> = {},
  options: {
    cookieValue?: string;
  } = {}
) {
  return {
    nextUrl: { pathname },
    method,
    headers: new Headers(headers),
    cookies: {
      get(name: string) {
        if (name !== 'forecaster_admin' || !options.cookieValue) {
          return undefined;
        }
        return { name, value: options.cookieValue };
      }
    }
  } as Parameters<typeof middleware>[0];
}
