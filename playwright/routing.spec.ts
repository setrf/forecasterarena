import { expect, test } from '@playwright/test';
import { seededRoutes } from './constants';

test('legacy model routes redirect to canonical family slugs', async ({ page }) => {
  await page.goto(seededRoutes.legacyModel);
  await expect(page).toHaveURL(new RegExp(`${seededRoutes.model}$`));
  await expect(page.getByRole('heading', { level: 1, name: 'GPT' })).toBeVisible();
});

test('legacy cohort model routes redirect to canonical family slugs', async ({ page }) => {
  await page.goto(seededRoutes.legacyCohortModel);
  await expect(page).toHaveURL(new RegExp(`${seededRoutes.cohortModel}$`));
  await expect(page.getByRole('heading', { level: 1, name: 'GPT' })).toBeVisible();
});
