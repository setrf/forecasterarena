import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.doUnmock('@/lib/api/admin-route');
  vi.doUnmock('@/lib/application/admin');
  vi.doUnmock('@/lib/application/admin-benchmark');
  vi.doUnmock('@/lib/api/admin-session');
  vi.resetModules();
});

describe('admin route error handling', () => {
  it('sanitizes login route failures through adminSafeErrorJson', async () => {
    const adminSafeErrorJson = vi.fn((error: unknown) => Response.json({
      error: `sanitized:${String(error)}`
    }, { status: 500 }));

    vi.doMock('@/lib/api/admin-route', () => ({
      adminSafeErrorJson
    }));
    vi.doMock('@/lib/api/admin-session', () => ({
      createAdminLoginResponse: () => {
        throw new Error('login exploded');
      },
      createAdminLogoutResponse: () => Response.json({ success: true })
    }));

    const route = await import('@/app/api/admin/login/route');
    const response = await route.POST(new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'admin' })
    }) as any);

    expect(adminSafeErrorJson).toHaveBeenCalledOnce();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'sanitized:Error: login exploded' });
  });

  it('sanitizes admin action failures through adminSafeErrorJson', async () => {
    const adminSafeErrorJson = vi.fn(() => Response.json({
      error: 'An internal error occurred'
    }, { status: 500 }));

    vi.doMock('@/lib/api/admin-route', () => ({
      ensureAdminAuthenticated: () => null,
      adminSafeErrorJson
    }));
    vi.doMock('@/lib/application/admin', () => ({
      runAdminAction: () => {
        throw new Error('action exploded');
      }
    }));

    const route = await import('@/app/api/admin/action/route');
    const response = await route.POST(new Request('http://localhost/api/admin/action', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'sync-markets' })
    }) as any);

    expect(adminSafeErrorJson).toHaveBeenCalledOnce();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'An internal error occurred' });
  });

  it('sanitizes benchmark mutation failures through adminSafeErrorJson', async () => {
    const adminSafeErrorJson = vi.fn(() => Response.json({
      error: 'An internal error occurred'
    }, { status: 500 }));

    vi.doMock('@/lib/api/admin-route', () => ({
      ensureAdminAuthenticated: () => null,
      adminSafeErrorJson
    }));
    vi.doMock('@/lib/application/admin-benchmark', () => ({
      createAdminModelReleaseRecord: () => {
        throw new Error('release exploded');
      },
      createAdminBenchmarkConfigRecord: () => {
        throw new Error('config exploded');
      },
      promoteAdminBenchmarkConfig: () => {
        throw new Error('default exploded');
      },
      applyAdminBenchmarkRollover: () => {
        throw new Error('rollover exploded');
      },
      getAdminBenchmarkRolloverPreview: () => {
        throw new Error('preview exploded');
      }
    }));

    const releaseRoute = await import('@/app/api/admin/benchmark/releases/route');
    const configRoute = await import('@/app/api/admin/benchmark/configs/route');
    const defaultRoute = await import('@/app/api/admin/benchmark/default/route');
    const rolloverRoute = await import('@/app/api/admin/benchmark/rollover/route');

    const responses = await Promise.all([
      releaseRoute.POST(new Request('http://localhost/api/admin/benchmark/releases', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}'
      }) as any),
      configRoute.POST(new Request('http://localhost/api/admin/benchmark/configs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}'
      }) as any),
      defaultRoute.POST(new Request('http://localhost/api/admin/benchmark/default', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}'
      }) as any),
      rolloverRoute.POST(new Request('http://localhost/api/admin/benchmark/rollover', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ config_id: 'config-1', apply: true })
      }) as any)
    ]);

    expect(adminSafeErrorJson).toHaveBeenCalledTimes(4);
    for (const response of responses) {
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'An internal error occurred' });
    }
  });
});
