import { expect, test } from '@playwright/test';
import { seededRoutes } from './constants';
import { loginAsAdmin } from './helpers';

test('admin benchmark control registers a release and promotes a future lineup', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto(seededRoutes.adminBenchmark);
  await page.waitForLoadState('domcontentloaded');

  await expect(page.getByRole('heading', { level: 1, name: 'Benchmark Control' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Current Default Lineup' })).toBeVisible();
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
  await expect(page.getByRole('button', { name: 'Promote playwright-lineup-gpt54' })).toBeVisible();

  await page.getByRole('button', { name: 'Promote playwright-lineup-gpt54' }).click();

  await expect(page.getByText('playwright-lineup-gpt54 promoted for future cohorts')).toBeVisible();
  await expect(page.locator('tr').filter({ hasText: 'playwright-lineup-gpt54' }).getByText('Default')).toBeVisible();
  await expect(page.locator('table').first()).toContainText('GPT-5.4');
});
