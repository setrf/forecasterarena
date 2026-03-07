import { expect, test } from '@playwright/test';
import { seededRoutes } from './constants';

test('models and research pages stay navigable from real UI links', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'View All Models' }).click();
  await expect(page).toHaveURL(/\/models$/);
  await expect(page.getByRole('heading', { level: 1, name: /Seven Frontier LLMs/i })).toBeVisible();

  await page.getByRole('link', { name: /Current Leader/i }).click();
  await expect(page).toHaveURL(new RegExp(`${seededRoutes.leaderModel}$`));
  await expect(page.getByRole('heading', { level: 1, name: 'Kimi K2' })).toBeVisible();

  await page.goto('/');
  await page.getByRole('link', { name: 'Read the Methodology' }).click();
  await expect(page).toHaveURL(/\/methodology$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Methodology' })).toBeVisible();

  await page.getByRole('link', { name: 'About' }).first().click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole('heading', { level: 1, name: /Reality as the/i })).toBeVisible();

  await page.getByRole('link', { name: 'Read the Methodology' }).last().click();
  await expect(page).toHaveURL(/\/methodology$/);

  await page.goto('/changelog');
  await expect(page.getByRole('heading', { level: 1, name: 'Changelog' })).toBeVisible();
  await page.getByRole('link', { name: 'Read Full Methodology' }).click();
  await expect(page).toHaveURL(/\/methodology$/);
});

test('cohort and market list pages drill into the seeded records', async ({ page }) => {
  await page.goto('/cohorts');
  await expect(page.getByRole('heading', { level: 1, name: /Weekly Cohorts/i })).toBeVisible();
  await page.getByRole('link', { name: /Cohort #1/i }).click();
  await expect(page).toHaveURL(new RegExp(`${seededRoutes.cohort}$`));
  await expect(page.getByRole('heading', { level: 1, name: 'Cohort #1' })).toBeVisible();

  await page.goto('/markets');
  await expect(page.getByRole('heading', { level: 1, name: /Prediction Markets/i })).toBeVisible();
  await page.getByLabel('Search markets').fill('definitely-missing-market');
  await expect(page.getByText('No markets found')).toBeVisible();

  await page.getByLabel('Search markets').fill('seeded e2e');
  const marketCard = page.locator('a').filter({ hasText: 'Will the Fed cut rates by 50+ bps' }).first();
  await expect(marketCard).toBeVisible();
  await marketCard.click();

  await expect(page).toHaveURL(new RegExp(`${seededRoutes.market}$`));
  await expect(page.getByRole('heading', { level: 1, name: /seeded e2e market/i })).toBeVisible();
});
