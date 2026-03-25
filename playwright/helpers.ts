import { expect, type Page } from '@playwright/test';

export async function expectAdminNav(page: Page) {
  await expect(page.getByRole('navigation', { name: 'Admin sections' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Benchmark' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Costs' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Logs' })).toBeVisible();
}

export async function expectAuthenticatedAdminShell(page: Page) {
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  await expectAdminNav(page);
}

export async function loginAsAdmin(page: Page) {
  await page.goto('/admin');
  await page.getByPlaceholder('Enter admin password').fill('admin');
  await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes('/api/admin/login') &&
      response.request().method() === 'POST' &&
      response.ok()
    ),
    page.getByRole('button', { name: 'Login' }).click()
  ]);
  await expectAuthenticatedAdminShell(page);
}
