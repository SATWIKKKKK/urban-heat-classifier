import { test, expect } from '@playwright/test';

test.describe('Public Pages', () => {
  test('homepage loads with KPI cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible({ timeout: 15000 });
    // Should show the dashboard-style main page with KPI data
    await expect(page.locator('body')).toBeVisible();
  });

  test('map page loads with Leaflet map', async ({ page }) => {
    await page.goto('/map');
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15000 });
  });

  test('scenarios page loads with comparison grid', async ({ page }) => {
    await page.goto('/scenarios');
    await expect(page.locator('h1')).toContainText('Scenario');
  });

  test('vulnerability page loads', async ({ page }) => {
    await page.goto('/vulnerability');
    await expect(page.locator('h1')).toContainText('Vulnerability');
  });

  test('reports page loads with templates', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.locator('h1')).toContainText('Reports');
    await expect(page.locator('text=Report Templates')).toBeVisible();
  });

  test('resident portal loads with hero section', async ({ page }) => {
    await page.goto('/resident');
    await expect(page.locator('h1')).toContainText('Place');
  });

  test('resident request tree page loads', async ({ page }) => {
    await page.goto('/resident/request-tree');
    await expect(page.locator('h1')).toContainText('Request a Tree');
  });

  test('resident my-requests page loads', async ({ page }) => {
    await page.goto('/resident/my-requests');
    await expect(page.locator('h1')).toContainText('My Requests');
  });
});
