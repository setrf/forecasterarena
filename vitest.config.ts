import { defineConfig } from 'vitest/config';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(rootDir, '.')
    }
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'lib/engine/execution.ts',
        'lib/db/queries/agents.ts',
        'lib/db/queries/benchmark-configs.ts',
        'lib/db/queries/brier-scores.ts',
        'lib/db/queries/cohorts.ts',
        'lib/db/queries/costs.ts',
        'lib/db/queries/decisions/claim.ts',
        'lib/db/queries/decisions/getters.ts',
        'lib/db/queries/decisions/write.ts',
        'lib/db/queries/leaderboard.ts',
        'lib/db/queries/logs.ts',
        'lib/db/queries/markets.ts',
        'lib/db/queries/model-families.ts',
        'lib/db/queries/model-releases.ts',
        'lib/db/queries/models.ts',
        'lib/db/queries/positions/read.ts',
        'lib/db/queries/positions/write.ts',
        'lib/db/queries/snapshots.ts',
        'lib/db/queries/trade-lineage.ts',
        'lib/db/queries/trades.ts',
        'lib/openrouter/parser/parseDecision.ts',
        'lib/polymarket/api.ts',
        'lib/polymarket/aggregates.ts',
        'lib/polymarket/resolution.ts',
        'lib/polymarket/transformers.ts',
        'lib/scoring/brier/confidence.ts',
        'lib/scoring/brier/display.ts',
        'lib/scoring/brier/score.ts',
        'lib/scoring/pnl/format.ts',
        'lib/scoring/pnl/portfolio.ts',
        'lib/scoring/pnl/summary.ts',
        'lib/scoring/pnl/values.ts',
        'lib/utils/security.ts'
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100
      }
    }
  }
});
