import { expect, test } from '@playwright/test';
import { seededRoutes } from './constants';
import { expectAuthenticatedAdminShell, loginAsAdmin } from './helpers';

test('admin benchmark control registers a release and promotes the default lineup', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto(seededRoutes.adminBenchmark);
  await page.waitForLoadState('domcontentloaded');

  await expect(page.getByRole('heading', { level: 1, name: 'Benchmark Control' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Current Default Lineup' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'OpenRouter Lineup Review' })).toBeVisible();
  await expect(page.getByText('Approval never rolls active cohorts')).toBeVisible();
  await expectAuthenticatedAdminShell(page);
  await expect(page.getByText('e2e-default').first()).toBeVisible();

  await page.getByLabel('Family').selectOption('openai-gpt');
  await page.getByLabel('Release Name').fill('GPT-5.4');
  await page.getByLabel('OpenRouter ID').fill('openai/gpt-5.4');
  await page.getByLabel('Input Price / 1M').fill('6');
  await page.getByLabel('Output Price / 1M').fill('18');
  await page.getByRole('button', { name: 'Register Release' }).click();

  await expect(page.getByText('GPT-5.4 registered successfully')).toBeVisible();
  await expect(page.locator('span').filter({ hasText: 'GPT-5.4' }).first()).toBeVisible();

  await page.getByLabel('Version Name').fill('playwright-lineup-gpt54');
  await page.getByLabel('GPT release').selectOption({ label: 'GPT-5.4' });
  await page.getByRole('button', { name: 'Create Benchmark Config' }).click();

  await expect(page.getByText('playwright-lineup-gpt54 created successfully')).toBeVisible();
  await expect(page.locator('tr').filter({ hasText: 'playwright-lineup-gpt54' }).getByRole('button', { name: 'Promote default' })).toBeVisible();

  await page.locator('tr').filter({ hasText: 'playwright-lineup-gpt54' }).getByRole('button', { name: 'Promote default' }).click();

  await expect(page.getByText('playwright-lineup-gpt54 promoted as the default lineup')).toBeVisible();
  await expectAuthenticatedAdminShell(page);
  await expect(page.locator('tr').filter({ hasText: 'playwright-lineup-gpt54' }).getByText('Default')).toBeVisible();
  await expect(page.locator('table').first()).toContainText('GPT-5.4');
});
