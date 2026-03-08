import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAdminCostsData } from '@/features/admin/costs/api';
import { formatCost, formatTokens } from '@/features/admin/costs/utils';
import { fetchAdminLogsData } from '@/features/admin/logs/api';
import { formatEventData, getSeverityStyle } from '@/features/admin/logs/utils';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('admin costs page data helpers', () => {
  it('normalizes costs payloads and formats values for display', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(mockResponse(true, {
      costs_by_model: [
        {
          public_model_id: 'openai-gpt',
          public_model_slug: 'openai-gpt',
          model_id: 'openai-gpt',
          family_id: 'openai-gpt',
          family_slug: 'openai-gpt',
          legacy_model_id: 'gpt-5.1',
          model_name: 'GPT-5.2',
          color: '#10B981',
          total_cost: 1.234,
          total_input_tokens: 1200,
          total_output_tokens: 3400,
          decision_count: 10
        }
      ],
      summary: {
        total_cost: 1.234,
        total_input_tokens: 1200,
        total_output_tokens: 3400,
        total_decisions: 10,
        avg_cost_per_decision: 0.1234
      }
    })));

    await expect(fetchAdminCostsData()).resolves.toEqual({
      costsByModel: [expect.objectContaining({ public_model_id: 'openai-gpt', family_slug: 'openai-gpt', family_id: 'openai-gpt', legacy_model_id: 'gpt-5.1' })],
      summary: expect.objectContaining({ total_cost: 1.234 })
    });

    expect(formatCost(0.0091)).toBe('$0.0091');
    expect(formatCost(0.1234)).toBe('$0.123');
    expect(formatCost(2.5)).toBe('$2.50');
    expect(formatTokens(1500)).toBe('1.5K');
    expect(formatTokens(2_000_000)).toBe('2M');
  });

  it('throws on non-ok admin cost responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(mockResponse(false, {}, 500)));
    await expect(fetchAdminCostsData()).rejects.toThrow('Failed to load admin costs');
  });
});

describe('admin logs page data helpers', () => {
  it('builds the log request, parses event data, and maps severity styles', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(mockResponse(true, {
      logs: [
        {
          id: 'log-1',
          event_type: 'sync',
          event_data: '{"value":1}',
          severity: 'warning',
          created_at: '2026-03-07T12:00:00.000Z'
        }
      ]
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchAdminLogsData('warning')).resolves.toEqual([
      expect.objectContaining({ id: 'log-1', severity: 'warning' })
    ]);
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/logs?severity=warning&limit=100');
    expect(formatEventData('{"value":1}')).toEqual({ value: 1 });
    expect(formatEventData('not-json')).toEqual({ raw: 'not-json' });
    expect(getSeverityStyle('warning')).toEqual({
      bg: 'bg-[var(--accent-amber)]/10',
      text: 'text-[var(--accent-amber)]',
      dot: 'bg-[var(--accent-amber)]'
    });
  });

  it('throws on non-ok admin log responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(mockResponse(false, {}, 500)));
    await expect(fetchAdminLogsData('all')).rejects.toThrow('Failed to load admin logs');
  });
});

function mockResponse(ok: boolean, json: unknown, status: number = 200) {
  return {
    ok,
    status,
    json: async () => json
  };
}
