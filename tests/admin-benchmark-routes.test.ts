import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.doUnmock('@/lib/api/admin-route');
  vi.doUnmock('@/lib/application/admin-benchmark');
  vi.resetModules();
});

describe('admin benchmark routes', () => {
  it('returns the admin benchmark overview through the route adapter', async () => {
    const payload = {
      default_config_id: 'config-1',
      families: [],
      configs: [],
      updated_at: '2026-03-07T00:00:00.000Z'
    };

    vi.doMock('@/lib/api/admin-route', () => ({
      ensureAdminAuthenticated: () => null,
      adminNoStoreJson: (body: unknown) => Response.json(body, {
        headers: { 'Cache-Control': 'no-store' }
      }),
      adminSafeErrorJson: (error: unknown) => Response.json({ error: String(error) }, { status: 500 })
    }));
    vi.doMock('@/lib/application/admin-benchmark', () => ({
      getAdminBenchmarkOverview: () => payload
    }));

    const route = await import('@/app/api/admin/benchmark/route');
    const response = await route.GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual(payload);
  });

  it('adapts release, config, and promotion mutations without reshaping errors', async () => {
    vi.doMock('@/lib/api/admin-route', () => ({
      ensureAdminAuthenticated: () => null
    }));
    vi.doMock('@/lib/application/admin-benchmark', () => ({
      createAdminModelReleaseRecord: vi.fn(() => ({
        ok: true as const,
        data: { success: true, release: { id: 'release-1' } }
      })),
      createAdminBenchmarkConfigRecord: vi.fn(() => ({
        ok: false as const,
        status: 400,
        error: 'Missing lineup assignments'
      })),
      promoteAdminBenchmarkConfig: vi.fn(() => ({
        ok: true as const,
        data: { success: true, config_id: 'config-1', version_name: 'lineup-v2' }
      }))
    }));

    const releaseRoute = await import('@/app/api/admin/benchmark/releases/route');
    const configRoute = await import('@/app/api/admin/benchmark/configs/route');
    const defaultRoute = await import('@/app/api/admin/benchmark/default/route');

    const releaseResponse = await releaseRoute.POST(new Request('http://localhost/api/admin/benchmark/releases', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ family_id: 'openai-gpt' })
    }) as any);
    expect(releaseResponse.status).toBe(200);
    expect(await releaseResponse.json()).toEqual({
      success: true,
      release: { id: 'release-1' }
    });

    const configResponse = await configRoute.POST(new Request('http://localhost/api/admin/benchmark/configs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ version_name: 'lineup-v2' })
    }) as any);
    expect(configResponse.status).toBe(400);
    expect(await configResponse.json()).toEqual({
      error: 'Missing lineup assignments'
    });

    const defaultResponse = await defaultRoute.POST(new Request('http://localhost/api/admin/benchmark/default', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ config_id: 'config-1' })
    }) as any);
    expect(defaultResponse.status).toBe(200);
    expect(await defaultResponse.json()).toEqual({
      success: true,
      config_id: 'config-1',
      version_name: 'lineup-v2'
    });
  });

  it('preserves unauthorized responses across the benchmark admin routes', async () => {
    vi.doMock('@/lib/api/admin-route', () => ({
      ensureAdminAuthenticated: () => Response.json({ error: 'Unauthorized' }, { status: 401 })
    }));

    const overviewRoute = await import('@/app/api/admin/benchmark/route');
    const releaseRoute = await import('@/app/api/admin/benchmark/releases/route');
    const configRoute = await import('@/app/api/admin/benchmark/configs/route');
    const defaultRoute = await import('@/app/api/admin/benchmark/default/route');

    const overviewResponse = await overviewRoute.GET();
    const releaseResponse = await releaseRoute.POST(new Request('http://localhost/api/admin/benchmark/releases', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}'
    }) as any);
    const configResponse = await configRoute.POST(new Request('http://localhost/api/admin/benchmark/configs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}'
    }) as any);
    const defaultResponse = await defaultRoute.POST(new Request('http://localhost/api/admin/benchmark/default', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}'
    }) as any);

    for (const response of [overviewResponse, releaseResponse, configResponse, defaultResponse]) {
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
    }
  });
});
