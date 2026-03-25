import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAdminSessionToken } from '@/lib/auth/adminSession';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';

afterEach(() => {
  vi.doUnmock('next/headers');
  vi.resetModules();
});

describe('admin session auth', () => {
  it('validates admin cookies with the session secret instead of the password', async () => {
    const ctx = await createIsolatedTestContext({
      nodeEnv: 'test',
      env: {
        ADMIN_PASSWORD: 'admin-password',
        ADMIN_SESSION_SECRET: 'session-secret'
      }
    });

    try {
      let cookieValue = createAdminSessionToken('session-secret');
      vi.doMock('next/headers', () => ({
        cookies: () => ({
          get: (name: string) => (
            name === 'forecaster_admin'
              ? { value: cookieValue }
              : undefined
          )
        })
      }));

      const { isAuthenticated } = await import('@/lib/auth');

      expect(isAuthenticated()).toBe(true);

      cookieValue = createAdminSessionToken('admin-password');
      expect(isAuthenticated()).toBe(false);
    } finally {
      await ctx.cleanup();
    }
  });
});
