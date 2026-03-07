import { expect, type Page } from '@playwright/test';

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

  await expect(
    page.getByRole('heading', { level: 1, name: 'Admin Dashboard' })
  ).toBeVisible({ timeout: 20_000 });
}
