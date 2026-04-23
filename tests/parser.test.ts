import { describe, expect, it, vi } from 'vitest';
import { parseDecision, isValidDecision, getDefaultHoldDecision } from '@/lib/openrouter/parser';

describe('openrouter/parser', () => {
  it('parses a valid HOLD decision', () => {
    const parsed = parseDecision(
      JSON.stringify({
        action: 'HOLD',
        reasoning: 'No edge this week.'
      })
    );

    expect(parsed).toEqual({
      action: 'HOLD',
      reasoning: 'No edge this week.'
    });
    expect(isValidDecision(parsed)).toBe(true);
  });

  it('parses JSON wrapped in markdown code fences', () => {
    const parsed = parseDecision(
      [
        '```json',
        '{',
        '  "action": "HOLD",',
        '  "reasoning": "Fence-wrapped output"',
        '}',
        '```'
      ].join('\n')
    );

    expect(parsed.action).toBe('HOLD');
    expect(parsed.reasoning).toBe('Fence-wrapped output');
  });

  it('parses JSON wrapped in outer quotes', () => {
    const quoted = `'{"action":"HOLD","reasoning":"Quoted wrapper"}'`;
    const parsed = parseDecision(quoted);
    expect(parsed.action).toBe('HOLD');
    expect(parsed.reasoning).toBe('Quoted wrapper');
  });

  it('parses JSON wrapped in outer double quotes', () => {
    const quoted = `"{ "action":"HOLD","reasoning":"Double-quoted wrapper" }"`;
    const parsed = parseDecision(quoted);
    expect(parsed.action).toBe('HOLD');
    expect(parsed.reasoning).toBe('Double-quoted wrapper');
  });

  it('parses embedded JSON when response starts with only a leading double quote', () => {
    const parsed = parseDecision(
      [
        '"I analyzed the markets and will now provide JSON.',
        '{',
        '  "action": "HOLD",',
        '  "reasoning": "Leading quote only"',
        '}',
        'Thank you.'
      ].join('\n')
    );

    expect(parsed.action).toBe('HOLD');
    expect(parsed.reasoning).toBe('Leading quote only');
  });

  it('extracts embedded JSON from prose-heavy responses', () => {
    const parsed = parseDecision(
      [
        'I analyzed the markets and will now provide JSON.',
        '{',
        '  "action": "SELL",',
        '  "sells": [{ "position_id": "pos-1", "percentage": 50 }],',
        '  "reasoning": "Reduce concentration risk"',
        '}',
        'Thank you.'
      ].join('\n')
    );

    expect(parsed.action).toBe('SELL');
    expect(parsed.sells).toHaveLength(1);
    expect(parsed.sells?.[0]).toEqual({ position_id: 'pos-1', percentage: 50 });
  });

  it('returns ERROR when extracted JSON candidate has no closing brace', () => {
    const parsed = parseDecision(
      [
        'I analyzed the markets and will now provide JSON.',
        '{',
        '  "action": "HOLD",',
        '  "reasoning": "Missing closing brace"'
      ].join('\n')
    );

    expect(parsed.action).toBe('ERROR');
    expect(parsed.error).toMatch(/JSON parse error/i);
  });

  it('returns ERROR for invalid JSON', () => {
    const parsed = parseDecision('{invalid json');
    expect(parsed.action).toBe('ERROR');
    expect(parsed.error).toMatch(/JSON parse error/i);
    expect(isValidDecision(parsed)).toBe(false);
  });

  it('returns ERROR when action is missing', () => {
    const parsed = parseDecision(
      JSON.stringify({
        reasoning: 'Missing action'
      })
    );
    expect(parsed.action).toBe('ERROR');
    expect(parsed.error).toMatch(/Missing action field/);
  });

  it('returns ERROR when reasoning is missing', () => {
    const parsed = parseDecision(
      JSON.stringify({
        action: 'HOLD'
      })
    );
    expect(parsed.action).toBe('ERROR');
    expect(parsed.error).toMatch(/Missing or invalid reasoning/);
  });

  it('returns ERROR for unsupported action values', () => {
    const parsed = parseDecision(
      JSON.stringify({
        action: 'WAIT',
        reasoning: 'Not a supported action'
      })
    );
    expect(parsed.action).toBe('ERROR');
    expect(parsed.error).toMatch(/Invalid action/);
  });

  it('returns ERROR for BET with empty bets array', () => {
    const parsed = parseDecision(
      JSON.stringify({
        action: 'BET',
        bets: [],
        reasoning: 'Will not pass validation'
      }),
      10_000
    );
    expect(parsed.action).toBe('ERROR');
    expect(parsed.error).toMatch(/BET action requires non-empty bets array/);
  });

  it('returns ERROR for BET below minimum amount', () => {
    const parsed = parseDecision(
      JSON.stringify({
        action: 'BET',
        bets: [{ market_id: 'm1', side: 'YES', amount: 10 }],
        reasoning: 'Tiny bet'
      }),
      10_000
    );
    expect(parsed.action).toBe('ERROR');
    expect(parsed.error).toMatch(/below minimum/i);
  });

  it('returns ERROR for BET above maximum amount', () => {
    const parsed = parseDecision(
      JSON.stringify({
        action: 'BET',
        bets: [{ market_id: 'm1', side: 'YES', amount: 3_000 }],
        reasoning: 'Too big'
      }),
      10_000
    );
    expect(parsed.action).toBe('ERROR');
    expect(parsed.error).toMatch(/exceeds maximum/i);
  });

  it('returns ERROR when total BET allocation exceeds the decision maximum', () => {
    const parsed = parseDecision(
      JSON.stringify({
        action: 'BET',
        bets: [
          { market_id: 'm1', side: 'YES', amount: 1_500 },
          { market_id: 'm2', side: 'NO', amount: 1_500 }
        ],
        reasoning: 'Each leg is below the cap, but the batch is too large'
      }),
      10_000
    );

    expect(parsed.action).toBe('ERROR');
    expect(parsed.error).toMatch(/maximum decision allocation/i);
  });

  it('returns ERROR for BET missing market_id', () => {
    const parsed = parseDecision(
      JSON.stringify({
        action: 'BET',
        bets: [{ market_id: '', side: 'YES', amount: 100 }],
        reasoning: 'Invalid bet payload'
      }),
      10_000
    );
    expect(parsed.action).toBe('ERROR');
    expect(parsed.error).toMatch(/Missing market_id/);
  });

  it('returns ERROR for BET missing side', () => {
    const parsed = parseDecision(
      JSON.stringify({
        action: 'BET',
        bets: [{ market_id: 'm1', side: '', amount: 100 }],
        reasoning: 'Invalid bet payload'
      }),
      10_000
    );
    expect(parsed.action).toBe('ERROR');
    expect(parsed.error).toMatch(/Missing side/);
  });

  it('returns ERROR for BET side that is only whitespace', () => {
    const parsed = parseDecision(
      JSON.stringify({
        action: 'BET',
        bets: [{ market_id: 'm1', side: '   ', amount: 100 }],
        reasoning: 'Invalid bet payload'
      }),
      10_000
    );
    expect(parsed.action).toBe('ERROR');
    expect(parsed.error).toMatch(/Side cannot be empty/);
  });

  it('returns ERROR for BET with non-numeric amount', () => {
    const parsed = parseDecision(
      JSON.stringify({
        action: 'BET',
        bets: [{ market_id: 'm1', side: 'YES', amount: '100' }],
        reasoning: 'Invalid amount type'
      }),
      10_000
    );
    expect(parsed.action).toBe('ERROR');
    expect(parsed.error).toMatch(/Invalid amount/);
  });

  it('keeps non-binary side labels exactly as provided', () => {
    const parsed = parseDecision(
      JSON.stringify({
        action: 'BET',
        bets: [{ market_id: 'm1', side: 'Candidate A', amount: 100 }],
        reasoning: 'Multi-outcome side should preserve case'
      }),
      10_000
    );

    expect(parsed.action).toBe('BET');
    expect(parsed.bets?.[0].side).toBe('Candidate A');
  });

  it('returns ERROR for SELL with invalid percentage', () => {
    const parsed = parseDecision(
      JSON.stringify({
        action: 'SELL',
        sells: [{ position_id: 'p1', percentage: 0 }],
        reasoning: 'Invalid boundary'
      })
    );
    expect(parsed.action).toBe('ERROR');
    expect(parsed.error).toMatch(/Percentage must be 1-100/);
  });

  it('returns ERROR for SELL with missing position_id', () => {
    const parsed = parseDecision(
      JSON.stringify({
        action: 'SELL',
        sells: [{ position_id: '', percentage: 50 }],
        reasoning: 'Missing id'
      })
    );
    expect(parsed.action).toBe('ERROR');
    expect(parsed.error).toMatch(/Missing position_id/);
  });

  it('returns ERROR for SELL with non-numeric percentage', () => {
    const parsed = parseDecision(
      JSON.stringify({
        action: 'SELL',
        sells: [{ position_id: 'p1', percentage: '50' }],
        reasoning: 'Invalid type'
      })
    );
    expect(parsed.action).toBe('ERROR');
    expect(parsed.error).toMatch(/Invalid percentage/);
  });

  it('returns ERROR for SELL with missing sells array', () => {
    const parsed = parseDecision(
      JSON.stringify({
        action: 'SELL',
        reasoning: 'No sells'
      })
    );
    expect(parsed.action).toBe('ERROR');
    expect(parsed.error).toMatch(/SELL action requires non-empty sells array/);
  });

  it('handles non-Error throws from JSON.parse safely', () => {
    const parseSpy = vi.spyOn(JSON, 'parse').mockImplementation(() => {
      throw 'string-parse-failure';
    });

    try {
      const parsed = parseDecision('{"action":"HOLD","reasoning":"x"}');
      expect(parsed).toEqual({
        action: 'ERROR',
        reasoning: '',
        error: 'JSON parse error: string-parse-failure'
      });
    } finally {
      parseSpy.mockRestore();
    }
  });

  it('produces consistent default HOLD decisions', () => {
    const fallback = getDefaultHoldDecision('retry exhausted');
    expect(fallback).toEqual({
      action: 'HOLD',
      reasoning: '[SYSTEM DEFAULT] retry exhausted'
    });
  });
});
