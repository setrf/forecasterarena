import { describe, expect, it } from 'vitest';
import { formatProbabilityPercent } from '@/lib/format/display';

describe('display formatting', () => {
  it('renders missing market prices as unknown instead of fake 50/50 odds', () => {
    expect(formatProbabilityPercent(null)).toBe('N/A');
    expect(formatProbabilityPercent(undefined)).toBe('N/A');
    expect(formatProbabilityPercent(null, { nullDisplay: 'No price' })).toBe('No price');
  });
});
