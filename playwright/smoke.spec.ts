import { expect, test } from '@playwright/test';
import { seededRoutes } from './constants';

test('public routes render the seeded benchmark state', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /AI Models/i })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Models' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /1 Kimi/i })).toBeVisible();

  await page.goto(seededRoutes.model);
  await expect(page.getByRole('heading', { level: 1, name: 'GPT' })).toBeVisible();
  await expect(page.getByText(/Current Release:/i)).toBeVisible();

  await page.goto(seededRoutes.cohort);
  await expect(page.getByRole('heading', { level: 1, name: 'Cohort #1' })).toBeVisible();
  const firstDecision = page.locator('[aria-expanded]').first();
  await expect(firstDecision).toBeVisible();
  await firstDecision.click();
  await expect(page.getByText('Model Reasoning')).toBeVisible();

  await page.goto(seededRoutes.cohortModel);
  await expect(page.getByRole('heading', { level: 1, name: 'GPT' })).toBeVisible();
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

  await page.goto(baseURL || 'http://127.0.0.1:3100');
  await page.getByRole('button', { name: 'Toggle menu' }).click();

  const mobileMenu = page.locator('header nav').last();
  await expect(mobileMenu).toContainText('Models');
  await expect(mobileMenu).toContainText('Cohorts');
  await expect(mobileMenu).toContainText('Markets');
  await expect(mobileMenu).toContainText('Methodology');
  await expect(mobileMenu).toContainText('About');

  await context.close();
});
