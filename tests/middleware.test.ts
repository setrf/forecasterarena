import { afterEach, describe, expect, it } from 'vitest';
import { createAdminSessionToken } from '@/lib/auth/adminSession';
import {
  getClientIp,
  getClientIpFromRequest,
  getRateLimitKey,
  getRateLimitKeyFromRequest
} from '@/lib/middleware/ip';
import { matchRateLimitPolicy } from '@/lib/middleware/policies';
import { resetRateLimitStore } from '@/lib/middleware/rateLimit';
import { middleware } from '@/middleware';

afterEach(() => {
  resetRateLimitStore();
});

describe('middleware helpers', () => {
  it('prefers the direct request ip and only trusts proxy headers when explicitly enabled', () => {
    expect(getClientIp(new Headers({
      'cf-connecting-ip': '1.1.1.1',
      'x-real-ip': '2.2.2.2',
      'x-forwarded-for': '3.3.3.3, 4.4.4.4'
    }), { peerIp: '9.9.9.9' })).toBe('9.9.9.9');

    expect(getClientIp(new Headers({
      'cf-connecting-ip': '1.1.1.1',
      'x-real-ip': '2.2.2.2',
      'x-forwarded-for': '3.3.3.3, 4.4.4.4'
    }))).toBe('unknown');

    expect(getClientIp(new Headers({
      'x-real-ip': '2.2.2.2',
      'x-forwarded-for': '3.3.3.3, 4.4.4.4'
    }), { trustProxyHeaders: true })).toBe('2.2.2.2');

    expect(getClientIp(new Headers({
      'x-forwarded-for': '3.3.3.3, 4.4.4.4'
    }), { trustProxyHeaders: true })).toBe('3.3.3.3');

    expect(getClientIp(new Headers())).toBe('unknown');
    expect(getClientIpFromRequest({
      headers: new Headers({ 'x-forwarded-for': '3.3.3.3, 4.4.4.4' }),
      ip: '10.0.0.9'
    })).toBe('10.0.0.9');
  });

  it('builds stable rate-limit keys and matches the expected policies', () => {
    expect(getRateLimitKey(new Headers({ 'x-real-ip': '9.9.9.9' }), 'login')).toBe('unknown:login');
    expect(getRateLimitKey(new Headers({ 'x-real-ip': '9.9.9.9' }), 'login', {
      trustProxyHeaders: true
    })).toBe('9.9.9.9:login');
    expect(getRateLimitKeyFromRequest({
      headers: new Headers({ 'x-forwarded-for': '1.1.1.1' }),
      ip: '7.7.7.7'
    }, 'login')).toBe('7.7.7.7:login');
    expect(matchRateLimitPolicy('/api/admin/login', 'POST')?.bucket).toBe('login');
    expect(matchRateLimitPolicy('/api/cron/run-decisions', 'POST')?.bucket).toBe('cron');
    expect(matchRateLimitPolicy('/api/admin/stats', 'GET')?.bucket).toBe('admin');
    expect(matchRateLimitPolicy('/api/cron/run-decisions', 'GET')).toBeNull();
  });
});

describe('middleware', () => {
  it('adds login rate-limit headers and blocks the sixth login attempt', async () => {
    const request = createRequest('/api/admin/login', 'POST', {}, { ip: '10.0.0.1' });

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
    const postRequest = createRequest('/api/cron/run-decisions', 'POST', {}, { ip: '10.0.0.2' });

    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await middleware(postRequest)).status).toBe(200);
    }

    const blocked = await middleware(postRequest);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBe('60');

    const getRequest = createRequest('/api/cron/run-decisions', 'GET', {}, { ip: '10.0.0.2' });
    expect((await middleware(getRequest)).status).toBe(200);
  });

  it('blocks admin api requests after the thirtieth request', async () => {
    const request = createRequest('/api/admin/stats', 'GET', {}, { ip: '10.0.0.3' });

    for (let attempt = 0; attempt < 30; attempt += 1) {
      expect((await middleware(request)).status).toBe(200);
    }

    const blocked = await middleware(request);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('content-type')).toContain('application/json');
  });

  it('skips admin api rate limiting for authenticated admin sessions', async () => {
    const token = createAdminSessionToken('dev-admin-session-secret');
    const request = createRequest(
      '/api/admin/costs',
      'GET',
      {
        cookie: `forecaster_admin=${token}`
      },
      {
        ip: '10.0.0.4',
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
    ip?: string;
  } = {}
) {
  return {
    nextUrl: { pathname },
    method,
    ip: options.ip,
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
