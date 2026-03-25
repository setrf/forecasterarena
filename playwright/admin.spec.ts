import { expect, test } from '@playwright/test';
import { seededExportWindow } from './constants';
import { expectAdminNav, loginAsAdmin } from './helpers';

function toDateTimeLocalValue(value: string) {
  return value.slice(0, 16);
}

test('admin login unlocks dashboard, actions, costs, logs, and export download', async ({ page }) => {
  await loginAsAdmin(page);

  await page.getByRole('button', { name: /Start New Cohort/i }).click();
  await expect(page.getByText('Cohort #2 started successfully')).toBeVisible();

  await page.getByRole('button', { name: /Check Cohorts/i }).click();
  await expect(page.getByText(/Checked cohorts/i)).toBeVisible();

  await page.route('**/api/admin/action', async (route) => {
    const request = route.request();
    if (request.method() !== 'POST') {
      await route.continue();
      return;
    }

    const body = request.postDataJSON() as { action?: string } | undefined;
    if (body?.action !== 'sync-markets') {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        markets_added: 2,
        markets_updated: 3
      })
    });
  });
  await page.getByRole('button', { name: /Sync Markets/i }).click();
  await expect(page.getByText('Synced 2 new, 3 updated')).toBeVisible();
  await page.unroute('**/api/admin/action');

  await page.getByRole('button', { name: /Create Backup/i }).click();
  await expect(page.getByText('Backup created successfully')).toBeVisible();

  await page.goto('/admin/costs');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByRole('heading', { level: 1, name: 'API Costs' })).toBeVisible();
  await expectAdminNav(page);
  await expect(page.getByText('$0.60', { exact: true })).toBeVisible();
  await expect(page.locator('tbody tr').filter({ hasText: 'GPT' })).toHaveCount(1);
  await expect(page.locator('tbody tr').filter({ hasText: 'Gemini' })).toHaveCount(1);

  await page.goto('/admin/logs');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByRole('heading', { level: 1, name: 'System Logs' })).toBeVisible();
  await expectAdminNav(page);
  await page.getByRole('button', { name: 'Warning', exact: true }).click();
  await expect(page.getByText('admin_seed_warning')).toBeVisible();
  await page.getByRole('button', { name: 'Error', exact: true }).click();
  await expect(page.getByText('admin_seed_error')).toBeVisible();

  await page.goto('/admin');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByRole('heading', { level: 1, name: 'Admin Dashboard' })).toBeVisible();
  await expect(page.getByLabel('Cohort ID')).toBeVisible();
  await page.getByLabel('Cohort ID').fill(seededExportWindow.cohortId);
  await page.getByRole('textbox', { name: 'From' }).fill(toDateTimeLocalValue(seededExportWindow.from));
  await page.getByRole('textbox', { name: 'To' }).fill(toDateTimeLocalValue(seededExportWindow.to));
  await page.getByLabel('Include prompts/responses (decisions)').check();
  await page.getByRole('button', { name: 'Generate Export' }).click();

  await expect(page.getByText('Export ready. Click to download.')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.zip$/);
});
