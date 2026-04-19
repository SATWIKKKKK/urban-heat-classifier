import { test, expect, type Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@heatplan.io');
  await page.fill('input[type="password"]', 'Admin@HeatPlan2024!');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
}

test.describe('Dashboard (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('dashboard overview loads with KPI cards', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('body')).toBeVisible();
    // Should display place count, intervention count, etc.
  });

  test('places page lists seeded places', async ({ page }) => {
    await page.goto('/dashboard/places');
    await expect(page.locator('h1')).toContainText('Place');
    // Should show 10 seeded places
    await expect(page.locator('text=Downtown')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=East Riverside')).toBeVisible();
  });

  test('interventions page lists seeded interventions', async ({ page }) => {
    await page.goto('/dashboard/interventions');
    await expect(page.locator('h1')).toContainText('Intervention');
    await expect(page.locator('text=Downtown Tree Corridor')).toBeVisible({ timeout: 10000 });
  });

  test('data management page loads with tabs', async ({ page }) => {
    await page.goto('/dashboard/data');
    await expect(page.locator('h1')).toContainText('Data');
    await expect(page.locator('text=CSV')).toBeVisible();
  });

  test('admin page is accessible to super admin', async ({ page }) => {
    await page.goto('/dashboard/admin');
    await expect(page.locator('body')).toBeVisible();
  });
});
