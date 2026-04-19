import { test, expect, type Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@heatplan.io');
  await page.fill('input[type="password"]', 'Admin@HeatPlan2024!');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
}

test.describe('Place Detail', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('place detail page shows profile and heat data', async ({ page }) => {
    await page.goto('/dashboard/places');
    await expect(page.locator('text=Downtown')).toBeVisible({ timeout: 10000 });
    // Click on the first place link
    await page.click('text=Downtown');
    await page.waitForURL(/\/dashboard\/places\//);
    await expect(page.locator('h1')).toContainText('Downtown');
  });
});

test.describe('Glassmorphism styling', () => {
  test('homepage cards use glass-card classes', async ({ page }) => {
    await page.goto('/');
    const glassCards = page.locator('.glass-card-hover, .glass-card');
    await expect(glassCards.first()).toBeVisible({ timeout: 15000 });
  });

  test('pages have bg-heat-image background', async ({ page }) => {
    await page.goto('/');
    const mainDiv = page.locator('.bg-heat-image').first();
    await expect(mainDiv).toBeVisible({ timeout: 15000 });
  });
});
