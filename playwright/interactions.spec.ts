import { expect, test } from '@playwright/test';
import { seededRoutes } from './constants';

test('home chart controls work against the seeded performance data', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 2, name: 'Portfolio Value Over Time' })).toBeVisible();

  await page.getByRole('button', { name: '$ Value' }).click();
  await expect(page.getByRole('button', { name: '% Return' })).toBeVisible();

  const leaderLegendButton = page.locator('button').filter({ hasText: /Kimi/i }).first();
  await expect(leaderLegendButton).toBeVisible();
  await leaderLegendButton.click();
  await expect(page.getByText('Showing only Kimi')).toBeVisible();

  await leaderLegendButton.click();
  await expect(page.getByText('Showing only Kimi')).toHaveCount(0);

  await page.getByRole('button', { name: 'ALL' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Current v2 Standings' })).toBeVisible();
});

test('model detail recent decisions open and close the reasoning modal', async ({ page }) => {
  await page.goto(seededRoutes.model);
  await expect(page.getByRole('heading', { level: 1, name: 'GPT' })).toBeVisible();

  await page.getByRole('button', { name: /Cohort #1, Week 1/i }).click();
  const modal = page.locator('.fixed.inset-0').last();
  await expect(modal.getByText('Reasoning')).toBeVisible();
  await expect(modal.getByText('The seeded market is priced below my conviction')).toBeVisible();

  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('button', { name: 'Close' })).toHaveCount(0);
});
