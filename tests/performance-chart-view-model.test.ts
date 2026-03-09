import { describe, expect, it, vi } from 'vitest';
import {
  buildPerformanceChartViewModel,
  getDisplayModels,
  getIsolatedModelName
} from '@/components/charts/performance/viewModel';

const models = [
  { id: 'alpha', name: 'Alpha', color: '#111111' },
  { id: 'beta', name: 'Beta', color: '#222222' }
];

describe('performance chart view model', () => {
  it('filters models for isolation and resolves the isolated model name', () => {
    expect(getDisplayModels(models, null)).toEqual(models);
    expect(getDisplayModels(models, 'beta')).toEqual([models[1]]);
    expect(getIsolatedModelName(models, 'beta')).toBe('Beta');
    expect(getIsolatedModelName(models, null)).toBeNull();
  });

  it('builds derived chart state from filtered data', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T12:00:00.000Z'));

    try {
      const viewModel = buildPerformanceChartViewModel({
        data: [
          { date: '2026-01-15T00:00:00.000Z', alpha: 9800, beta: 10200 },
          { date: '2026-03-02T00:00:00.000Z', alpha: 10100, beta: 10300 },
          { date: '2026-03-07T00:00:00.000Z', alpha: 10500, beta: 10400 }
        ],
        models,
        releaseChanges: [],
        timeRange: '1M',
        isolatedModel: 'alpha'
      });

      expect(viewModel.filteredData).toEqual([
        { date: '2026-03-02T00:00:00.000Z', alpha: 10100, beta: 10300 },
        { date: '2026-03-07T00:00:00.000Z', alpha: 10500, beta: 10400 }
      ]);
      expect(viewModel.displayModels).toEqual([models[0]]);
      expect(viewModel.isolatedModelName).toBe('Alpha');
      expect(viewModel.leaderId).toBe('alpha');
      expect(viewModel.latestValues).toEqual({ alpha: 10500, beta: 10400 });
      expect(viewModel.previousValues).toEqual({ alpha: 10100, beta: 10300 });
      expect(viewModel.sundayMarkers).toEqual([]);
      expect(viewModel.yDomain).toEqual([9500, 11000]);
    } finally {
      vi.useRealTimers();
    }
  });
});
