import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.doUnmock('@/lib/api/result-response');
  vi.doUnmock('@/lib/application/cron');
  vi.doUnmock('@/lib/application/admin-benchmark');
  vi.resetModules();
});

describe('cron check-model-lineup route', () => {
  it('uses the shared cron auth/result adapter', async () => {
    const cronResultJson = vi.fn(async (_request: Request, loadResult: () => unknown) => {
      const result = await loadResult();
      return Response.json(result);
    });
    const checkModelLineup = vi.fn(() => ({
      ok: true as const,
      data: {
        success: true,
        review_id: 'review-1',
        status: 'open',
        candidate_count: 1,
        checked_at: '2026-05-01T00:00:00.000Z'
      }
    }));

    vi.doMock('@/lib/api/result-response', () => ({ cronResultJson }));
    vi.doMock('@/lib/application/cron', () => ({ checkModelLineup }));

    const route = await import('@/app/api/cron/check-model-lineup/route');
    const request = new Request('http://localhost/api/cron/check-model-lineup', { method: 'POST' });
    const response = await route.POST(request);

    expect(cronResultJson).toHaveBeenCalledWith(request, checkModelLineup);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      data: {
        review_id: 'review-1'
      }
    });
  });

  it('reports failed catalog checks as cron failures', async () => {
    vi.doMock('@/lib/application/admin-benchmark', () => ({
      checkModelLineupReview: vi.fn(async () => ({
        id: 'review-failed',
        status: 'failed',
        checked_at: '2026-05-01T00:00:00.000Z',
        reviewed_at: null,
        candidate_count: 0,
        target_config_id: null,
        error_message: 'OpenRouter unavailable',
        candidates: []
      }))
    }));

    const { checkModelLineup } = await import('@/lib/application/cron/checkModelLineup');
    const result = await checkModelLineup();

    expect(result).toEqual({
      ok: false,
      status: 502,
      error: 'OpenRouter unavailable'
    });
  });
});
