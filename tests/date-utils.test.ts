import { afterEach, describe, expect, it, vi } from 'vitest';
import { nowTimestamp } from '@/lib/utils/date/now';

describe('date utilities', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('buckets operational timestamps to stable 10-minute intervals for snapshot retries', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T12:17:59.999Z'));
    const firstAttempt = nowTimestamp();

    vi.setSystemTime(new Date('2026-05-01T12:19:01.000Z'));
    const retryAttempt = nowTimestamp();

    expect(firstAttempt).toBe('2026-05-01 12:10:00');
    expect(retryAttempt).toBe(firstAttempt);
  });
});
