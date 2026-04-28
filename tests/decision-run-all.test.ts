import { afterEach, describe, expect, it, vi } from 'vitest';

const getDecisionEligibleCohorts = vi.fn();
const logSystemEvent = vi.fn();
const runCohortDecisions = vi.fn();

vi.mock('@/lib/db', () => ({
  logSystemEvent
}));

vi.mock('@/lib/db/queries', () => ({
  getDecisionEligibleCohorts
}));

vi.mock('@/lib/engine/decision/runCohortDecisions', () => ({
  runCohortDecisions
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('runAllDecisions', () => {
  it('processes only the decision-eligible latest cohorts', async () => {
    getDecisionEligibleCohorts.mockReturnValue([
      { id: 'cohort-7', cohort_number: 7 },
      { id: 'cohort-6', cohort_number: 6 }
    ]);
    runCohortDecisions.mockImplementation(async (cohortId: string) => ({
      cohort_id: cohortId,
      cohort_number: Number(cohortId.replace('cohort-', '')),
      week_number: 1,
      agents_processed: 1,
      decisions: [],
      errors: []
    }));

    const { runAllDecisions } = await import('@/lib/engine/decision/runAllDecisions');
    const result = await runAllDecisions(2);

    expect(getDecisionEligibleCohorts).toHaveBeenCalledWith(2);
    expect(runCohortDecisions).toHaveBeenCalledTimes(2);
    expect(runCohortDecisions).toHaveBeenNthCalledWith(1, 'cohort-7');
    expect(runCohortDecisions).toHaveBeenNthCalledWith(2, 'cohort-6');
    expect(result.map((cohort) => cohort.cohort_id)).toEqual(['cohort-7', 'cohort-6']);
  });

  it('does not replace an errored eligible cohort with an older cohort', async () => {
    getDecisionEligibleCohorts.mockReturnValue([
      { id: 'cohort-7', cohort_number: 7 },
      { id: 'cohort-6', cohort_number: 6 }
    ]);
    runCohortDecisions
      .mockRejectedValueOnce(new Error('provider outage'))
      .mockResolvedValueOnce({
        cohort_id: 'cohort-6',
        cohort_number: 6,
        week_number: 1,
        agents_processed: 1,
        decisions: [],
        errors: []
      });

    const { runAllDecisions } = await import('@/lib/engine/decision/runAllDecisions');
    const result = await runAllDecisions(2);

    expect(runCohortDecisions).toHaveBeenCalledTimes(2);
    expect(result.map((cohort) => cohort.cohort_id)).toEqual(['cohort-6']);
    expect(logSystemEvent).toHaveBeenCalledWith(
      'cohort_decisions_error',
      expect.objectContaining({ cohort_id: 'cohort-7', error: 'provider outage' }),
      'error'
    );
  });
});
