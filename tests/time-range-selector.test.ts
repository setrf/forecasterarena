import { describe, expect, it } from 'vitest';
import { VISIBLE_TIME_RANGES } from '@/components/charts/TimeRangeSelector';

describe('time range selector', () => {
  it('hides unsupported short chart ranges from visible controls', () => {
    expect(VISIBLE_TIME_RANGES.map((range) => range.value)).toEqual([
      '1D',
      '1W',
      '1M',
      '3M',
      'ALL'
    ]);
    expect(VISIBLE_TIME_RANGES.map((range) => range.value)).not.toContain('10M');
    expect(VISIBLE_TIME_RANGES.map((range) => range.value)).not.toContain('1H');
  });
});
