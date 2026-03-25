import { afterEach, describe, expect, it, vi } from 'vitest';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';

afterEach(() => {
  vi.doUnmock('next/headers');
  vi.resetModules();
});

describe('security and config behavior', () => {
  it('fails closed for admin/cron secrets in production when env vars are missing', async () => {
    const ctx = await createIsolatedTestContext({
      nodeEnv: 'production',
      env: {
        CRON_SECRET: undefined,
        ADMIN_PASSWORD: undefined,
        OPENROUTER_API_KEY: undefined
      }
    });

    try {
      const constants = await import('@/lib/constants');
      expect(constants.IS_PRODUCTION).toBe(true);
      expect(constants.CRON_SECRET).toBe('');
      expect(constants.ADMIN_PASSWORD).toBe('');
      expect(constants.OPENROUTER_API_KEY).toBeUndefined();
    } finally {
      await ctx.cleanup();
    }
  });

  it('uses development defaults when not in production', async () => {
    const ctx = await createIsolatedTestContext({
      nodeEnv: 'development',
      env: {
        CRON_SECRET: undefined,
        ADMIN_PASSWORD: undefined,
        OPENROUTER_API_KEY: undefined
      }
    });

    try {
      const constants = await import('@/lib/constants');
      expect(constants.IS_PRODUCTION).toBe(false);
      expect(constants.CRON_SECRET).toBe('dev-secret');
      expect(constants.ADMIN_PASSWORD).toBe('admin');
      expect(constants.OPENROUTER_API_KEY).toBeUndefined();
    } finally {
      await ctx.cleanup();
    }
  });

  it('returns 503 from admin login when production admin auth is not fully configured', async () => {
    const ctx = await createIsolatedTestContext({
      nodeEnv: 'production',
      env: {
        ADMIN_PASSWORD: undefined,
        ADMIN_SESSION_SECRET: undefined
      }
    });

    try {
      const route = await import('@/app/api/admin/login/route');
      const request = new Request('http://localhost/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'irrelevant' })
      });

      const response = await route.POST(request as any);
      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body).toEqual({ error: 'Admin authentication is not configured' });
    } finally {
      await ctx.cleanup();
    }
  });

  it('verifies admin cookies with the session secret instead of the admin password', async () => {
    const ctx = await createIsolatedTestContext({
      nodeEnv: 'development',
      env: {
        ADMIN_PASSWORD: 'admin-password',
        ADMIN_SESSION_SECRET: 'separate-session-secret'
      }
    });

    try {
      const { createAdminSessionToken } = await import('@/lib/auth/adminSession');
      const token = createAdminSessionToken('separate-session-secret');

      vi.doMock('next/headers', () => ({
        cookies: () => ({
          get(name: string) {
            if (name !== 'forecaster_admin') {
              return undefined;
            }

            return { name, value: token };
          }
        })
      }));

      const auth = await import('@/lib/auth');
      expect(auth.isAuthenticated()).toBe(true);
    } finally {
      await ctx.cleanup();
    }
  });

  it('rejects all cron endpoints when production cron secret is not configured', async () => {
    const ctx = await createIsolatedTestContext({
      nodeEnv: 'production',
      env: {
        CRON_SECRET: undefined
      }
    });

    const routeLoaders = [
      () => import('@/app/api/cron/sync-markets/route'),
      () => import('@/app/api/cron/start-cohort/route'),
      () => import('@/app/api/cron/run-decisions/route'),
      () => import('@/app/api/cron/check-resolutions/route'),
      () => import('@/app/api/cron/take-snapshots/route'),
      () => import('@/app/api/cron/backup/route')
    ];

    try {
      for (const loadRoute of routeLoaders) {
        const route = await loadRoute();
        const request = new Request('http://localhost/cron', {
          method: 'POST'
        });

        const response = await route.POST(request as any);
        expect(response.status).toBe(401);
      }
    } finally {
      await ctx.cleanup();
    }
  });
});
