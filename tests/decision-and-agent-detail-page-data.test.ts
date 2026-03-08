import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAgentCohortDetailData } from '@/features/cohorts/model-detail/api';
import { fetchDecisionDetailData } from '@/features/decisions/detail/api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('decision detail page data helper', () => {
  it('normalizes decision payloads and preserves error states', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(mockResponse(true, {
        decision: {
          id: 'decision-1',
          market_id: 'market-1',
          agent_id: 'agent-1',
          parsed_response: '{"action":"HOLD"}',
          reasoning: 'Hold steady',
          created_at: '2026-03-07T00:00:00.000Z',
          model_name: 'GPT-5.2',
          model_color: '#10B981',
          model_provider: 'OpenAI'
        },
        trades: [
          {
            id: 'trade-1',
            trade_type: 'BUY',
            side: 'YES',
            shares: 10,
            price: 0.4,
            total_amount: 4,
            executed_at: '2026-03-07T00:00:00.000Z',
            market_question: 'Will this pass?',
            market_slug: 'pass',
            market_event_slug: 'event-pass',
            market_id: 'market-1'
          }
        ]
      }))
      .mockResolvedValueOnce(mockResponse(false, {}, 404))
      .mockResolvedValueOnce(mockResponse(false, {}, 500)));

    await expect(fetchDecisionDetailData('decision-1')).resolves.toEqual({
      status: 'ok',
      data: {
        decision: expect.objectContaining({ id: 'decision-1' }),
        trades: [expect.objectContaining({ id: 'trade-1' })]
      }
    });
    await expect(fetchDecisionDetailData('missing')).resolves.toEqual({
      status: 'error',
      error: 'Decision not found'
    });
    await expect(fetchDecisionDetailData('broken')).resolves.toEqual({
      status: 'error',
      error: 'Failed to load decision'
    });
  });
});

describe('agent cohort detail page data helper', () => {
  it('returns agent cohort payloads and preserves API error messages', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(mockResponse(true, {
        cohort: { id: 'c1', cohort_number: 1, started_at: '2026-03-01T00:00:00.000Z', status: 'active' },
        model: { id: 'openai-gpt', slug: 'openai-gpt', legacy_model_id: 'gpt-5.1', display_name: 'GPT-5.2', color: '#10B981' },
        agent: { id: 'a1', model_id: 'openai-gpt', legacy_model_id: 'gpt-5.1', display_name: 'GPT-5.2', status: 'active' },
        stats: { position_count: 1, trade_count: 2 },
        positions: [],
        closed_positions: [],
        decisions: [],
        trades: []
      }))
      .mockResolvedValueOnce(mockResponse(false, { error: 'Model is not active in this cohort' }, 404))
      .mockResolvedValueOnce(mockResponse(false, {}, 500)));

    await expect(fetchAgentCohortDetailData('c1', 'gpt-5.1')).resolves.toEqual({
      status: 'ok',
      data: expect.objectContaining({
        cohort: expect.objectContaining({ id: 'c1' }),
        model: expect.objectContaining({ id: 'openai-gpt', legacy_model_id: 'gpt-5.1' })
      })
    });
    await expect(fetchAgentCohortDetailData('c1', 'missing')).resolves.toEqual({
      status: 'error',
      error: 'Model is not active in this cohort'
    });
    await expect(fetchAgentCohortDetailData('c1', 'broken')).resolves.toEqual({
      status: 'error',
      error: 'Failed to load data'
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
