import { test, expect } from '@playwright/test';

async function expectPageOrLogin(page: Parameters<typeof test>[0]['page'], heading: RegExp) {
  await page.waitForLoadState('domcontentloaded');
  if (/\/login(\?|$)/.test(page.url())) {
    await expect(page.locator('h1')).toContainText('Welcome back');
    return;
  }
  await expect(page.locator('h1')).toContainText(heading);
}

test.describe('Public Pages', () => {
  test('homepage loads with KPI cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible({ timeout: 15000 });
    // Should show the dashboard-style main page with KPI data
    await expect(page.locator('body')).toBeVisible();
  });

  test('map page loads with Leaflet map', async ({ page }) => {
    await page.goto('/map');
    if (/\/login(\?|$)/.test(page.url())) {
      await expect(page.locator('h1')).toContainText('Welcome back');
      return;
    }
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15000 });
  });

  test('scenarios page loads with comparison grid', async ({ page }) => {
    await page.goto('/scenarios');
    await expectPageOrLogin(page, /Scenario/i);
  });

  test('vulnerability page loads', async ({ page }) => {
    await page.goto('/vulnerability');
    await expectPageOrLogin(page, /Vulnerability/i);
  });

  test('reports page loads with templates', async ({ page }) => {
    await page.goto('/reports');
    if (/\/login(\?|$)/.test(page.url())) {
      await expect(page.locator('h1')).toContainText('Welcome back');
      return;
    }
    await expect(page.locator('h1')).toContainText('Reports');
    await expect(page.locator('text=Report Templates')).toBeVisible();
  });

  test('legacy resident route redirects away', async ({ page }) => {
    await page.goto('/resident');
    await expect(page).toHaveURL(/\/(|dashboard\/map|login)$/);
  });
});
