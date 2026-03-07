import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test('admin dashboard restores and clears session state correctly', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { level: 1, name: 'Admin Login' })).toBeVisible();

  await loginAsAdmin(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Admin Dashboard' })).toBeVisible();

  await page.goto('/admin');
  await expect(page.getByRole('heading', { level: 1, name: 'Admin Dashboard' })).toBeVisible();

  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Admin Login' })).toBeVisible();

  await page.goto('/admin/costs');
  await expect(page.getByRole('heading', { level: 1, name: 'API Costs' })).toBeVisible();
  await expect(page.getByText('No cost data available')).toBeVisible();
});
