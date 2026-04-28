import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.skip(process.env.E2E_SEED_SCENARIO !== 'empty', 'Empty-state suite only runs against the empty scenario');

test('public pages render the empty benchmark state intentionally', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Awaiting First Cohort').first()).toBeVisible();
  await expect(page.getByText('Awaiting first score')).toBeVisible();
  await expect(page.getByText('Pending')).toBeVisible();

  await page.goto('/cohorts');
  await expect(page.getByText('No Decision Cohorts')).toBeVisible();
  await expect(page.getByText('No Resolving Cohorts')).toBeVisible();
  await expect(page.getByText('No Completed Cohorts')).toBeVisible();

  await page.goto('/markets');
  await expect(page.getByText('No markets found')).toBeVisible();

  await page.goto('/models');
  await expect(page.getByText('N/A').first()).toBeVisible();
});

test('admin pages render empty states cleanly when no cohort data exists', async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto('/admin/costs');
  await expect(page.getByRole('heading', { level: 1, name: 'API Costs' })).toBeVisible();
  await expect(page.getByText('$0.0000').first()).toBeVisible();
  expect(await page.locator('tbody tr').count()).toBeGreaterThan(0);

  await page.goto('/admin/logs');
  await expect(page.getByRole('heading', { level: 1, name: 'System Logs' })).toBeVisible();
  await expect(page.getByText('admin_login_success')).toBeVisible();
});
