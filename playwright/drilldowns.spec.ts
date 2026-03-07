import { expect, test } from '@playwright/test';
import { seededRoutes } from './constants';

test('market detail rows drill into decision detail and back again', async ({ page }) => {
  await page.goto(seededRoutes.market);
  await expect(page.getByRole('heading', { level: 1, name: /seeded e2e market/i })).toBeVisible();

  const tradeRow = page.locator('tbody tr')
    .filter({ hasText: 'GPT-5.2' })
    .filter({ hasText: 'BUY' })
    .first();
  await expect(tradeRow).toBeVisible();
  await tradeRow.click();
  await expect(page).toHaveURL(new RegExp(`${seededRoutes.decision}$`));
  await expect(page.getByRole('heading', { level: 1, name: /Decision on:/i })).toBeVisible();
  await expect(page.getByText('The seeded market is priced below my conviction')).toBeVisible();

  await page.getByRole('link', { name: 'Back to Market' }).click();
  await expect(page).toHaveURL(new RegExp(`${seededRoutes.market}$`));
});

test('cohort detail links drill into the seeded cohort-model page', async ({ page }) => {
  await page.goto(seededRoutes.cohort);
  await expect(page.getByRole('heading', { level: 1, name: 'Cohort #1' })).toBeVisible();

  const firstDecision = page.locator('[aria-expanded]').first();
  await firstDecision.click();
  await expect(page.getByText('Model Reasoning')).toBeVisible();

  await page.locator('tbody tr').filter({ hasText: 'GPT-5.2' }).first().click();
  await expect(page).toHaveURL(new RegExp(`${seededRoutes.cohortModel}$`));
  await expect(page.getByRole('heading', { level: 1, name: 'GPT-5.2' })).toBeVisible();

  await page.getByRole('link', { name: /View Full Cohort Leaderboard/i }).click();
  await expect(page).toHaveURL(new RegExp(`${seededRoutes.cohort}$`));
});
