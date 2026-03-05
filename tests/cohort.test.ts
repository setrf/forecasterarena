import { describe, expect, it, vi } from 'vitest';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';

describe('engine/cohort', () => {
  it('creates a cohort and agents when forced', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });
    try {
      const cohortEngine = await import('@/lib/engine/cohort');
      const result = cohortEngine.maybeStartNewCohort(true);

      expect(result.success).toBe(true);
      expect(result.cohort).toBeDefined();
      expect(result.agents?.length).toBeGreaterThan(0);
    } finally {
      await ctx.cleanup();
    }
  });

  it('is idempotent within the same week', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });
    try {
      const cohortEngine = await import('@/lib/engine/cohort');
      const first = cohortEngine.maybeStartNewCohort(true);
      const second = cohortEngine.maybeStartNewCohort(true);

      expect(first.success).toBe(true);
      expect(second.success).toBe(true);
      expect(first.cohort?.id).toBe(second.cohort?.id);
    } finally {
      await ctx.cleanup();
    }
  });

  it('does not start when outside Sunday window unless forced', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-04T12:00:00.000Z')); // Wednesday

    try {
      const cohortEngine = await import('@/lib/engine/cohort');
      const result = cohortEngine.maybeStartNewCohort(false);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Not Sunday|outside start window/i);
    } finally {
      await ctx.cleanup();
    }
  });
});
