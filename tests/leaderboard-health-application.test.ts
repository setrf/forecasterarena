import { describe, expect, it } from 'vitest';
import { getHealthHttpStatus, getHealthReport } from '@/lib/application/health';
import { getLeaderboardData } from '@/lib/application/leaderboard';

describe('leaderboard application', () => {
  it('combines leaderboard data, cohort summaries, and an update timestamp', () => {
    const fixedNow = new Date('2026-03-06T12:34:56.789Z');
    const leaderboard = [{ family_slug: 'family-1', total_pnl: 42 }] as any;
    const cohorts = [{ id: 'cohort-1', cohort_number: 1 }] as any;
    const models = [{ id: 'openai-gpt', displayName: 'GPT' }] as any;

    expect(getLeaderboardData({
      getAggregateLeaderboard: () => leaderboard,
      getCohortSummaries: () => cohorts,
      getPublicCatalogModels: () => models,
      now: () => fixedNow
    })).toEqual({
      leaderboard,
      cohorts,
      models,
      updated_at: fixedNow.toISOString()
    });
  });
});

describe('health application', () => {
  it('returns an ok report when database, environment, and integrity checks pass', () => {
    const fixedNow = new Date('2026-03-06T12:34:56.789Z');
    const db = {
      prepare(query: string) {
        if (query === 'SELECT 1 as test') {
          return {
            get: () => ({ test: 1 })
          };
        }

        return {
          get: () => ({ count: 0 })
        };
      }
    };

    const report = getHealthReport({
      getDb: () => db as any,
      configuredSecrets: ['openrouter', 'cron', 'admin'],
      now: () => fixedNow
    });

    expect(report).toEqual({
      status: 'ok',
      timestamp: fixedNow.toISOString(),
      checks: {
        database: {
          status: 'ok',
          message: undefined
        },
        environment: {
          status: 'ok',
          message: undefined
        },
        data_integrity: {
          status: 'ok',
          message: undefined
        }
      }
    });
    expect(getHealthHttpStatus(report.status)).toBe(200);
  });

  it('returns a failing report when configuration is incomplete and database checks fail', () => {
    const fixedNow = new Date('2026-03-06T12:34:56.789Z');

    const report = getHealthReport({
      getDb: () => {
        throw new Error('secret details');
      },
      configuredSecrets: [undefined, undefined, undefined],
      now: () => fixedNow
    });

    expect(report).toEqual({
      status: 'error',
      timestamp: fixedNow.toISOString(),
      checks: {
        database: {
          status: 'error',
          message: 'Database unavailable'
        },
        environment: {
          status: 'error',
          message: 'Required configuration is incomplete'
        },
        data_integrity: {
          status: 'error',
          message: 'Integrity check unavailable'
        }
      }
    });
    expect(getHealthHttpStatus(report.status)).toBe(503);
  });
});
