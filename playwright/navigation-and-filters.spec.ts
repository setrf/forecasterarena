import { expect, test } from '@playwright/test';

test('market filters and footer navigation stay usable', async ({ page }) => {
  await page.goto('/markets');
  await expect(page.getByRole('heading', { level: 1, name: /Prediction Markets/i })).toBeVisible();

  await page.getByLabel('Filter markets by category').selectOption('Macro');
  await page.getByLabel('Only show markets with open positions in active cohorts').check();
  await page.getByLabel('Sort markets').selectOption('close_date');
  await expect(page.locator('a').filter({ hasText: 'seeded e2e market' }).first()).toBeVisible();

  await page.goto('/');
  await page.getByRole('navigation', { name: 'Explore' }).getByRole('link', { name: 'Changelog' }).click();
  await expect(page).toHaveURL(/\/changelog$/);
  await expect(page.getByRole('heading', { level: 1, name: /Methodology and platform changes/i })).toBeVisible();

  await page.getByRole('navigation', { name: 'Research' }).getByRole('link', { name: 'About' }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole('heading', { level: 1, name: /Reality as the/i })).toBeVisible();
});
