import { defineConfig } from '@playwright/test';

const seedScenario = process.env.E2E_SEED_SCENARIO || 'rich';
const databasePath = `.tmp/e2e/forecaster-e2e-${seedScenario}.db`;

const webServerEnv = Object.fromEntries(
  Object.entries({
    ...process.env,
    DATABASE_PATH: databasePath,
    E2E_SEED_SCENARIO: seedScenario,
    NODE_ENV: 'development',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin',
    CRON_SECRET: process.env.CRON_SECRET || 'dev-secret',
    NODE_DISABLE_COLORS: '1'
  }).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
);
delete webServerEnv.FORCE_COLOR;

export default defineConfig({
  testDir: './playwright',
  workers: 1,
  fullyParallel: false,
  timeout: 30_000,
  expect: {
    timeout: 10_000
  },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: {
    command: 'node scripts/prepare-e2e-db.mjs && npm run dev -- --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    env: webServerEnv
  }
});
