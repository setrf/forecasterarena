import { describe, expect, it } from 'vitest';
import {
  formatChartCurrency,
  formatChartDecimal,
  formatChartPercent,
  interpretBrierScore,
  sortBrierChartData,
  sortPnLChartData
} from '@/components/charts/bar/utils';

describe('chart bar utils', () => {
  it('sorts pnl rows descending and keeps the input immutable', () => {
    const data = [
      { model_id: 'a', model_name: 'Alpha', color: '#111', pnl: 5, pnl_percent: 0.5 },
      { model_id: 'b', model_name: 'Beta', color: '#222', pnl: 10, pnl_percent: 1.2 }
    ];

    expect(sortPnLChartData(data).map((entry) => entry.model_id)).toEqual(['b', 'a']);
    expect(data.map((entry) => entry.model_id)).toEqual(['a', 'b']);
  });

  it('sorts brier rows ascending and interprets score bands', () => {
    const data = [
      { model_id: 'a', model_name: 'Alpha', color: '#111', brier_score: 0.22, num_bets: 4 },
      { model_id: 'b', model_name: 'Beta', color: '#222', brier_score: 0.08, num_bets: 8 }
    ];

    expect(sortBrierChartData(data).map((entry) => entry.model_id)).toEqual(['b', 'a']);
    expect(interpretBrierScore(0.05).label).toBe('Excellent');
    expect(interpretBrierScore(0.15).label).toBe('Good');
    expect(interpretBrierScore(0.22).label).toBe('Fair');
    expect(interpretBrierScore(0.35).label).toBe('Poor');
  });

  it('formats chart values consistently', () => {
    expect(formatChartCurrency(12.5)).toBe('+$13');
    expect(formatChartPercent(-1.234)).toBe('-1.2%');
    expect(formatChartDecimal(0.125)).toBe('0.13');
  });
});
