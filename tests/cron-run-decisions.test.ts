import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const logSystemEvent = vi.fn();
const runAllDecisions = vi.fn();
const getActiveCohorts = vi.fn<() => Array<{ id: string; cohort_number: number }>>(() => []);
const getDecisionEligibleCohorts = vi.fn<() => Array<{ id: string; cohort_number: number }>>(() => []);

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(() => ({
    prepare: vi.fn(() => ({
      all: vi.fn(() => []),
      run: vi.fn()
    }))
  })),
  logSystemEvent,
  withImmediateTransaction: vi.fn((callback: () => unknown) => callback())
}));

vi.mock('@/lib/db/queries', () => ({
  getActiveCohorts,
  getBenchmarkConfigModels: vi.fn(() => []),
  getDecisionEligibleCohorts,
  getDefaultBenchmarkConfig: vi.fn(() => ({ id: 'benchmark-default' }))
}));

vi.mock('@/lib/engine/cohort', () => ({
  maybeStartNewCohort: vi.fn(() => ({
    success: false,
    error: 'Not Sunday or outside start window'
  }))
}));

vi.mock('@/lib/engine/decision', () => ({
  runAllDecisions
}));

function cohortResult(args: {
  cohortId: string;
  errors: string[];
  successes?: number;
  failures?: number;
}) {
  const successes = args.successes ?? 0;
  const failures = args.failures ?? args.errors.length;

  return {
    cohort_id: args.cohortId,
    cohort_number: Number(args.cohortId.replace(/\D/g, '')) || 1,
    week_number: 1,
    agents_processed: successes + failures,
    decisions: [
      ...Array.from({ length: successes }, (_, index) => ({
        agent_id: `${args.cohortId}-success-${index}`,
        model_id: `model-success-${index}`,
        decision_id: `decision-success-${index}`,
        action: 'HOLD',
        success: true
      })),
      ...Array.from({ length: failures }, (_, index) => ({
        agent_id: `${args.cohortId}-failure-${index}`,
        model_id: `model-failure-${index}`,
        decision_id: `decision-failure-${index}`,
        action: 'ERROR',
        success: false,
        error: args.errors[index] ?? 'Model failed'
      }))
    ],
    errors: args.errors
  };
}

describe('application cron runDecisions', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    getActiveCohorts.mockReturnValue([]);
    getDecisionEligibleCohorts.mockReturnValue([]);
  });

  it('returns a cron failure when every processed agent fails', async () => {
    runAllDecisions.mockResolvedValue([
      cohortResult({
        cohortId: 'cohort-1',
        errors: ['GPT-4.1: OpenRouter 402 insufficient credits'],
        failures: 1
      }),
      cohortResult({
        cohortId: 'cohort-2',
        errors: ['Claude: OpenRouter 402 insufficient credits'],
        failures: 1
      })
    ]);

    const { runDecisions } = await import('@/lib/application/cron/runDecisions');
    const result = await runDecisions();

    expect(result).toMatchObject({
      ok: false,
      status: 502,
      error: expect.stringContaining('Decision run failed for all 2 processed agents')
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('First error: GPT-4.1: OpenRouter 402 insufficient credits');
    }
    expect(logSystemEvent).toHaveBeenCalledWith(
      'decisions_run_failed',
      expect.objectContaining({
        cohorts_processed: 2,
        total_agents: 2,
        total_errors: 2,
        successful_agents: 0,
        sample_errors: [
          'GPT-4.1: OpenRouter 402 insufficient credits',
          'Claude: OpenRouter 402 insufficient credits'
        ]
      }),
      'error'
    );
  });

  it('preserves success when at least one processed agent succeeds', async () => {
    runAllDecisions.mockResolvedValue([
      cohortResult({
        cohortId: 'cohort-1',
        errors: ['Claude: OpenRouter 402 insufficient credits'],
        successes: 1,
        failures: 1
      })
    ]);

    const { runDecisions } = await import('@/lib/application/cron/runDecisions');
    const result = await runDecisions();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({
        success: true,
        decision_cohort_limit: 5,
        cohorts_processed: 1,
        total_agents: 2,
        total_errors: 1
      });
    }
    expect(logSystemEvent).not.toHaveBeenCalledWith(
      'decisions_run_failed',
      expect.anything(),
      expect.anything()
    );
  });

  it('reports tracking-active and decision-eligible cohort counts separately', async () => {
    getActiveCohorts.mockReturnValue([
      { id: 'cohort-7', cohort_number: 7 },
      { id: 'cohort-6', cohort_number: 6 },
      { id: 'cohort-2', cohort_number: 2 }
    ]);
    getDecisionEligibleCohorts.mockReturnValue([
      { id: 'cohort-7', cohort_number: 7 },
      { id: 'cohort-6', cohort_number: 6 }
    ]);
    runAllDecisions.mockResolvedValue([
      cohortResult({ cohortId: 'cohort-7', errors: [], successes: 1 }),
      cohortResult({ cohortId: 'cohort-6', errors: [], successes: 1 })
    ]);

    const { runDecisions } = await import('@/lib/application/cron/runDecisions');
    const result = await runDecisions();

    expect(runAllDecisions).toHaveBeenCalledWith(5);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({
        decision_cohort_limit: 5,
        tracking_active_cohorts: 3,
        decision_eligible_cohorts: 2,
        cohorts_processed: 2,
        total_agents: 2
      });
    }
  });
});
