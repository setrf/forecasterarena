import { expect, test } from '@playwright/test';
import { seededRoutes } from './constants';

test('decision detail route renders seeded action details directly', async ({ page }) => {
  await page.goto(seededRoutes.decision);
  await expect(page.getByRole('heading', { level: 1, name: /Decision on:/i })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Rationale' })).toBeVisible();
  const actionCard = page.locator('.glass-card').filter({
    has: page.getByRole('heading', { level: 3, name: 'Action Taken' })
  }).first();
  await expect(actionCard).toBeVisible();
  await expect(actionCard.getByText('Side')).toBeVisible();
  await expect(actionCard.getByText('YES')).toBeVisible();
  await expect(actionCard.getByText('$5.00')).toBeVisible();
  await expect(page.locator('pre')).toContainText('{');

  await page.getByRole('link', { name: 'Back to Market' }).click();
  await expect(page).toHaveURL(new RegExp(`${seededRoutes.market}$`));
});
