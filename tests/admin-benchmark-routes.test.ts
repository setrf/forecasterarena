import { afterEach, describe, expect, it, vi } from 'vitest';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';

afterEach(() => {
  vi.doUnmock('@/lib/api/admin-route');
  vi.doUnmock('@/lib/auth');
  vi.doUnmock('@/lib/application/admin-benchmark');
  vi.resetModules();
});

describe('admin benchmark routes', () => {
  function adminRouteMock(authenticated = true) {
    const unauthorized = () => Response.json({ error: 'Unauthorized' }, { status: 401 });
    return {
      ensureAdminAuthenticated: () => (authenticated ? null : unauthorized()),
      adminNoStoreJson: (body: unknown, init?: ResponseInit) => Response.json(body, {
        ...init,
        headers: { ...init?.headers, 'Cache-Control': 'no-store' }
      }),
      adminSafeErrorJson: (error: unknown) => Response.json({ error: String(error) }, { status: 500 }),
      readAdminJsonObject: async (request: Request) => (
        await request.json().catch(() => ({}))
      ),
      adminApplicationResultJson: (result: any) => (
        result.ok
          ? Response.json(result.data)
          : Response.json({ error: result.error }, { status: result.status })
      ),
      withAdminAuth: async (handler: () => Response | Promise<Response>) => (
        authenticated ? handler() : unauthorized()
      )
    };
  }

  it('returns the admin benchmark overview through the route adapter', async () => {
    const payload = {
      default_config_id: 'config-1',
      families: [],
      configs: [],
      updated_at: '2026-03-07T00:00:00.000Z'
    };

    vi.doMock('@/lib/api/admin-route', () => adminRouteMock());
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
    vi.doMock('@/lib/api/admin-route', () => adminRouteMock());
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
    vi.doMock('@/lib/api/admin-route', () => adminRouteMock(false));

    const overviewRoute = await import('@/app/api/admin/benchmark/route');
    const releaseRoute = await import('@/app/api/admin/benchmark/releases/route');
    const configRoute = await import('@/app/api/admin/benchmark/configs/route');
    const defaultRoute = await import('@/app/api/admin/benchmark/default/route');
    const checkReviewRoute = await import('@/app/api/admin/benchmark/reviews/check/route');
    const approveReviewRoute = await import('@/app/api/admin/benchmark/reviews/[id]/approve/route');
    const dismissReviewRoute = await import('@/app/api/admin/benchmark/reviews/[id]/dismiss/route');

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
    const checkReviewResponse = await checkReviewRoute.POST();
    const approveReviewResponse = await approveReviewRoute.POST(
      new Request('http://localhost/api/admin/benchmark/reviews/review-1/approve', { method: 'POST' }) as any,
      { params: { id: 'review-1' } }
    );
    const dismissReviewResponse = await dismissReviewRoute.POST(
      new Request('http://localhost/api/admin/benchmark/reviews/review-1/dismiss', { method: 'POST' }) as any,
      { params: { id: 'review-1' } }
    );

    for (const response of [
      overviewResponse,
      releaseResponse,
      configResponse,
      defaultResponse,
      checkReviewResponse,
      approveReviewResponse,
      dismissReviewResponse
    ]) {
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
    }
  });

  it('adapts lineup review check, approval, and dismissal mutations', async () => {
    vi.doMock('@/lib/api/admin-route', () => adminRouteMock());
    vi.doMock('@/lib/application/admin-benchmark', () => ({
      checkModelLineupReview: vi.fn(async () => ({
        id: 'review-1',
        status: 'open',
        checked_at: '2026-05-01T00:00:00.000Z',
        reviewed_at: null,
        candidate_count: 1,
        target_config_id: null,
        error_message: null,
        candidates: []
      })),
      approveModelLineupReviewRecord: vi.fn(() => ({
        ok: true as const,
        data: {
          success: true,
          config_id: 'config-1',
          version_name: 'lineup-review',
          review: { id: 'review-1' }
        }
      })),
      dismissModelLineupReviewRecord: vi.fn(() => ({
        ok: false as const,
        status: 400,
        error: 'Lineup review is approved and cannot be dismissed'
      }))
    }));

    const checkReviewRoute = await import('@/app/api/admin/benchmark/reviews/check/route');
    const approveReviewRoute = await import('@/app/api/admin/benchmark/reviews/[id]/approve/route');
    const dismissReviewRoute = await import('@/app/api/admin/benchmark/reviews/[id]/dismiss/route');

    const checkResponse = await checkReviewRoute.POST();
    expect(checkResponse.status).toBe(200);
    expect(await checkResponse.json()).toMatchObject({
      id: 'review-1',
      status: 'open',
      candidate_count: 1
    });

    const approveResponse = await approveReviewRoute.POST(
      new Request('http://localhost/api/admin/benchmark/reviews/review-1/approve', { method: 'POST' }) as any,
      { params: { id: 'review-1' } }
    );
    expect(approveResponse.status).toBe(200);
    expect(await approveResponse.json()).toMatchObject({
      success: true,
      config_id: 'config-1'
    });

    const dismissResponse = await dismissReviewRoute.POST(
      new Request('http://localhost/api/admin/benchmark/reviews/review-1/dismiss', { method: 'POST' }) as any,
      { params: { id: 'review-1' } }
    );
    expect(dismissResponse.status).toBe(400);
    expect(await dismissResponse.json()).toEqual({
      error: 'Lineup review is approved and cannot be dismissed'
    });
  });

  it('returns 400 instead of 500 for malformed benchmark mutation payloads', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      vi.doMock('@/lib/api/admin-route', () => adminRouteMock());

      const releaseRoute = await import('@/app/api/admin/benchmark/releases/route');
      const configRoute = await import('@/app/api/admin/benchmark/configs/route');
      const releaseResponse = await releaseRoute.POST(new Request('http://localhost/api/admin/benchmark/releases', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          family_id: 'openai-gpt',
          release_name: null,
          openrouter_id: 'openai/bad-release',
          default_input_price_per_million: 1,
          default_output_price_per_million: 2
        })
      }) as any);
      const configResponse = await configRoute.POST(new Request('http://localhost/api/admin/benchmark/configs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          version_name: null,
          assignments: []
        })
      }) as any);
      const nullAssignmentResponse = await configRoute.POST(new Request('http://localhost/api/admin/benchmark/configs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          version_name: 'lineup-null-assignment',
          assignments: [null]
        })
      }) as any);

      expect(releaseResponse.status).toBe(400);
      expect(await releaseResponse.json()).toEqual({ error: 'Release name is required' });
      expect(configResponse.status).toBe(400);
      expect(await configResponse.json()).toEqual({ error: 'Version name is required' });
      expect(nullAssignmentResponse.status).toBe(400);
      expect(await nullAssignmentResponse.json()).toEqual({ error: 'Lineup assignments must be objects' });
    } finally {
      await ctx.cleanup();
    }
  });

  it('sanitizes unexpected benchmark mutation errors through the shared helper', async () => {
    const ctx = await createIsolatedTestContext({
      nodeEnv: 'production',
      env: {
        ADMIN_PASSWORD: 'admin',
        ADMIN_SESSION_SECRET: 'session-secret'
      }
    });

    try {
      vi.doMock('@/lib/auth', () => ({
        isAuthenticated: () => true
      }));
      vi.doMock('@/lib/application/admin-benchmark', () => ({
        createAdminBenchmarkConfigRecord: () => {
          throw new Error('config parser detail');
        }
      }));

      const route = await import('@/app/api/admin/benchmark/configs/route');
      const response = await route.POST(new Request('http://localhost/api/admin/benchmark/configs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ version_name: 'lineup-v3' })
      }) as any);

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'An internal error occurred' });
    } finally {
      await ctx.cleanup();
    }
  });
});
