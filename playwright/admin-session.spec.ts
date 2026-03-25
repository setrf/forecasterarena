import { expect, test } from '@playwright/test';
import { expectAdminNav, expectAuthenticatedAdminShell, loginAsAdmin } from './helpers';

test('admin dashboard restores and clears session state correctly', async ({ page }) => {
  await page.goto('/admin');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByPlaceholder('Enter admin password')).toBeVisible();

  await loginAsAdmin(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Admin Dashboard' })).toBeVisible();

  await page.goto('/admin');
  await expect(page.getByRole('heading', { level: 1, name: 'Admin Dashboard' })).toBeVisible();
  await expectAuthenticatedAdminShell(page);

  await page.goto('/admin/benchmark');
  await expect(page.getByRole('heading', { level: 1, name: 'Benchmark Control' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Current Default Lineup' })).toBeVisible();
  await expectAuthenticatedAdminShell(page);

  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page.getByPlaceholder('Enter admin password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();

  await page.goto('/admin/costs');
  await expect(page.getByRole('heading', { level: 1, name: 'API Costs' })).toBeVisible();
  await expectAdminNav(page);
  await expect(page.getByText('Admin authentication required')).toBeVisible();

  await page.goto('/admin/benchmark');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByPlaceholder('Enter admin password')).toBeVisible();
});
