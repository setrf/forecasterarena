import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchCohortDetailData } from '@/features/cohorts/detail/api';
import { fetchModelDetailData } from '@/features/models/detail/api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('cohort detail page data helper', () => {
  it('normalizes payloads and preserves cohort error messages', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(mockResponse(true, {
        cohort: { id: 'c1', cohort_number: 1, started_at: '2026-03-01T00:00:00.000Z', status: 'active', decision_eligible: true, decision_status: 'decisioning', completed_at: null, methodology_version: 'v1', initial_balance: 10000 },
        agents: [{ id: 'a1', family_slug: 'openai-gpt', family_id: 'openai-gpt', legacy_model_id: 'gpt-5.1', model_display_name: 'GPT', model_color: '#10B981', cash_balance: 10000, total_invested: 0, status: 'active', total_value: 10000, total_pnl: 0, total_pnl_percent: 0, brier_score: null, position_count: 0, trade_count: 0, num_resolved_bets: 0 }],
        stats: { week_number: 1, total_trades: 3, total_positions_open: 2, markets_with_positions: 2, avg_brier_score: 0.15 },
        equity_curves: { 'openai-gpt': [{ date: '2026-03-01', value: 10000 }] },
        release_changes: [],
        recent_decisions: [{ id: 'd1', agent_id: 'a1', cohort_id: 'c1', decision_week: 1, decision_timestamp: '2026-03-02T00:00:00.000Z', action: 'HOLD', reasoning: 'Wait', family_slug: 'openai-gpt', family_id: 'openai-gpt', legacy_model_id: 'gpt-5.1', model_display_name: 'GPT', model_color: '#10B981' }]
      }))
      .mockResolvedValueOnce(mockResponse(false, {}, 404))
      .mockResolvedValueOnce(mockResponse(false, {}, 500)));

    await expect(fetchCohortDetailData('c1')).resolves.toEqual({
      status: 'ok',
      data: {
        cohort: expect.objectContaining({
          id: 'c1',
          decision_eligible: true,
          decision_status: 'decisioning'
        }),
        agents: [expect.objectContaining({ id: 'a1', family_slug: 'openai-gpt' })],
        stats: expect.objectContaining({ total_trades: 3 }),
        equityCurves: { 'openai-gpt': [{ date: '2026-03-01', value: 10000 }] },
        releaseChanges: [],
        decisions: [expect.objectContaining({ id: 'd1', family_slug: 'openai-gpt' })]
      }
    });
    await expect(fetchCohortDetailData('missing')).resolves.toEqual({
      status: 'error',
      error: 'Cohort not found'
    });
    await expect(fetchCohortDetailData('broken')).resolves.toEqual({
      status: 'error',
      error: 'Failed to load cohort'
    });
  });
});

describe('model detail page data helper', () => {
  it('returns model detail payloads and distinguishes 404s from server failures', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(mockResponse(true, {
        model: { id: 'openai-gpt', slug: 'openai-gpt', legacy_model_id: 'gpt-5.1', display_name: 'GPT-5.2', provider: 'OpenAI', color: '#10B981' },
        num_cohorts: 2,
        total_pnl: 120,
        avg_pnl_percent: 1.2,
        avg_brier_score: 0.14,
        win_rate: 0.6,
        cohort_performance: [],
        recent_decisions: [],
        equity_curve: []
      }))
      .mockResolvedValueOnce(mockResponse(false, {}, 404))
      .mockResolvedValueOnce(mockResponse(false, {}, 500)));

    await expect(fetchModelDetailData('gpt-5.1')).resolves.toEqual(
      expect.objectContaining({
        status: 'ok',
        data: expect.objectContaining({
          model: expect.objectContaining({ id: 'openai-gpt', legacy_model_id: 'gpt-5.1' }),
          num_cohorts: 2,
          total_pnl: 120
        })
      })
    );
    await expect(fetchModelDetailData('missing')).resolves.toEqual({
      status: 'error',
      error: 'Model not found'
    });
    await expect(fetchModelDetailData('broken')).resolves.toEqual({
      status: 'error',
      error: 'Failed to load model'
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
