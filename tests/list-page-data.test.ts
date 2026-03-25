import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchCohortsPageData } from '@/features/cohorts/list/api';
import { fetchModelsPageData } from '@/features/models/list/api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('models list page data helper', () => {
  it('normalizes leaderboard data and exposes a stable error state', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(mockResponse(true, {
        leaderboard: [
          {
            family_slug: 'openai-gpt',
            total_pnl: 42,
            avg_brier_score: 0.12,
            win_rate: 0.7,
            num_resolved_bets: 10
          }
        ],
        models: [
          {
            id: 'openai-gpt',
            displayName: 'GPT-5.2',
            provider: 'OpenAI',
            color: '#10B981'
          }
        ],
        cohorts: [{ total_markets_traded: 5 }]
      }))
      .mockResolvedValueOnce(mockResponse(false, {}, 503)));

    await expect(fetchModelsPageData()).resolves.toEqual({
      status: 'ok',
      data: {
        models: [expect.objectContaining({ id: 'openai-gpt', displayName: 'GPT-5.2' })],
        leaderboard: [expect.objectContaining({ family_slug: 'openai-gpt', total_pnl: 42 })],
        hasRealData: true
      }
    });

    await expect(fetchModelsPageData()).resolves.toEqual({
      status: 'error',
      error: 'Failed to load model rankings.'
    });
  });
});

describe('cohorts list page data helper', () => {
  it('normalizes cohort lists and exposes a stable error state', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(mockResponse(true, {
        cohorts: [
          {
            id: 'cohort-1',
            cohort_number: 1,
            started_at: '2026-03-01T00:00:00.000Z',
            status: 'active',
            num_agents: 7,
            total_markets_traded: 3,
            methodology_version: 'v1'
          }
        ]
      }))
      .mockResolvedValueOnce(mockResponse(false, {}, 500)));

    await expect(fetchCohortsPageData()).resolves.toEqual({
      status: 'ok',
      data: [expect.objectContaining({ id: 'cohort-1', status: 'active' })]
    });

    await expect(fetchCohortsPageData()).resolves.toEqual({
      status: 'error',
      error: 'Failed to load cohorts.'
    });
  });
});

function mockResponse(ok: boolean, json: unknown, status: number = 200) {
  return {
    ok,
    status,
    json: async () => json
  };
}
