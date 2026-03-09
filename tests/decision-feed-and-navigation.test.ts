import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchRecentDecisions } from '@/components/decision-feed/api';
import { getDecisionActionStyle, hasDecisionReasoning } from '@/components/decision-feed/utils';
import { PUBLIC_NAV_LINKS } from '@/components/navigation/config';
import { isNavActive } from '@/components/navigation/utils';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('decision feed helpers', () => {
  it('loads recent decisions from the public endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(mockResponse(true, {
      decisions: [
        {
          id: 'decision-1',
          agent_id: 'agent-1',
          cohort_id: 'cohort-1',
          decision_week: 3,
          decision_timestamp: '2026-03-07T12:00:00.000Z',
          action: 'BET',
          reasoning: 'Probability is moving up',
          model_display_name: 'GPT-5',
          model_color: '#10B981',
          cohort_number: 4
        }
      ]
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchRecentDecisions(5)).resolves.toEqual([
      expect.objectContaining({ id: 'decision-1', action: 'BET' })
    ]);
    expect(fetchMock).toHaveBeenCalledWith('/api/decisions/recent?limit=5');
    expect(getDecisionActionStyle('BET')).toEqual({
      bg: 'bg-[var(--accent-emerald)]/20',
      text: 'text-[var(--accent-emerald)]'
    });
    expect(hasDecisionReasoning(' thesis ')).toBe(true);
    expect(hasDecisionReasoning('   ')).toBe(false);
    expect(hasDecisionReasoning(null)).toBe(false);
  });

  it('throws when the decision feed endpoint fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(mockResponse(false, {}, 500)));
    await expect(fetchRecentDecisions(10)).rejects.toThrow('Failed to load recent decisions');
  });
});

describe('navigation helpers', () => {
  it('keeps public navigation config stable and matches active routes', () => {
    expect(PUBLIC_NAV_LINKS.map((link) => link.href)).toEqual([
      '/models',
      '/cohorts',
      '/markets',
      '/methodology',
      '/changelog',
      '/about'
    ]);
    expect(isNavActive('/', '/')).toBe(true);
    expect(isNavActive('/models/gpt-5', '/models')).toBe(true);
    expect(isNavActive('/about', '/models')).toBe(false);
  });
});

function mockResponse(ok: boolean, json: unknown, status: number = 200) {
  return {
    ok,
    status,
    json: async () => json
  };
}
