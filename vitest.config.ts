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
        'lib/openrouter/parser.ts',
        'lib/polymarket/api.ts',
        'lib/polymarket/aggregates.ts',
        'lib/polymarket/resolution.ts',
        'lib/polymarket/transformers.ts',
        'lib/scoring/brier.ts',
        'lib/scoring/pnl.ts',
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
