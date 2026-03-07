import { defineConfig } from '@playwright/test';

const databasePath = '.tmp/e2e/forecaster-e2e.db';

export default defineConfig({
  testDir: './playwright',
  fullyParallel: false,
  timeout: 30_000,
  expect: {
    timeout: 10_000
  },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: {
    command: 'node scripts/prepare-e2e-db.mjs && npm run dev -- --hostname 127.0.0.1 --port 3000',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      DATABASE_PATH: databasePath,
      NODE_ENV: 'development',
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin',
      CRON_SECRET: process.env.CRON_SECRET || 'dev-secret'
    }
  }
});
