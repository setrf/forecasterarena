import { expect, test } from '@playwright/test';

const seededRoutes = {
  model: '/models/gpt-5.1',
  cohort: '/cohorts/cohort-e2e-1',
  cohortModel: '/cohorts/cohort-e2e-1/models/gpt-5.1',
  market: '/markets/market-e2e-fed'
};

test('public routes render the seeded benchmark state', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /AI Models/i })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Models' }).first()).toBeVisible();
  await expect(page.getByText('Kimi K2')).toBeVisible();

  await page.goto(seededRoutes.model);
  await expect(page.getByRole('heading', { level: 1, name: 'GPT-5.2' })).toBeVisible();
  await expect(page.getByText(/OpenRouter ID/i)).toBeVisible();

  await page.goto(seededRoutes.cohort);
  await expect(page.getByRole('heading', { level: 1, name: 'Cohort #1' })).toBeVisible();
  const firstDecision = page.locator('[aria-expanded]').first();
  await expect(firstDecision).toBeVisible();
  await firstDecision.click();
  await expect(page.getByText('Model Reasoning')).toBeVisible();

  await page.goto(seededRoutes.cohortModel);
  await expect(page.getByRole('heading', { level: 1, name: 'GPT-5.2' })).toBeVisible();
  await expect(page.getByText('Rank', { exact: true })).toBeVisible();

  await page.goto(seededRoutes.market);
  await expect(page.getByRole('heading', { level: 1, name: /seeded e2e market/i })).toBeVisible();
  await expect(page.getByText('BUY')).toBeVisible();
});

test('mobile navigation drawer exposes the expected links', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();

  await page.goto(baseURL || 'http://127.0.0.1:3000');
  await page.getByRole('button', { name: 'Toggle menu' }).click();

  const mobileMenu = page.locator('header nav').last();
  await expect(mobileMenu).toContainText('Models');
  await expect(mobileMenu).toContainText('Cohorts');
  await expect(mobileMenu).toContainText('Markets');
  await expect(mobileMenu).toContainText('Methodology');
  await expect(mobileMenu).toContainText('About');

  await context.close();
});

test('admin login unlocks dashboard, costs, and logs', async ({ page }) => {
  await page.goto('/admin');
  await page.getByPlaceholder('Enter admin password').fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Admin Dashboard' })).toBeVisible();
  await expect(page.getByRole('link', { name: /System Logs/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /API Costs/i })).toBeVisible();

  await page.goto('/admin/costs');
  await expect(page.getByRole('heading', { level: 1, name: 'API Costs' })).toBeVisible();
  await expect(page.getByText('$0.600')).toBeVisible();
  await expect(page.getByText('Total Decisions')).toBeVisible();
  await expect(page.locator('tbody tr').filter({ hasText: 'GPT-5.2' })).toHaveCount(1);
  await expect(page.locator('tbody tr').filter({ hasText: 'Gemini 3 Pro' })).toHaveCount(1);

  await page.goto('/admin/logs');
  await expect(page.getByRole('heading', { level: 1, name: 'System Logs' })).toBeVisible();
  await page.getByRole('button', { name: 'Warning', exact: true }).click();
  await expect(page.getByText('admin_seed_warning')).toBeVisible();
  await page.getByRole('button', { name: 'Error', exact: true }).click();
  await expect(page.getByText('admin_seed_error')).toBeVisible();
});
