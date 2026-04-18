import { test, expect } from '@playwright/test';

test.describe('Onboarding', () => {
  test('city admin can launch from onboarding into the app', async ({ page }) => {
    const suffix = `${Date.now()}`;
    const email = `launch-${suffix}@heatplan.test`;
    const cityName = `Launch Test City ${suffix}`;
    const password = 'Admin@HeatPlan2024!';

    await page.goto('/register');
    const registerInputs = page.locator('form input');
    await registerInputs.nth(0).fill('Launch Test Admin');
    await registerInputs.nth(1).fill(email);
    await registerInputs.nth(2).fill(password);
    await registerInputs.nth(3).fill(password);
    await registerInputs.nth(4).fill(cityName);
    await page.getByRole('button', { name: /create account/i }).click();

    await page.waitForURL(/\/dashboard\/onboarding/, { timeout: 20000 });

    for (let index = 0; index < 5; index += 1) {
      await page.getByRole('button', { name: /continue/i }).click();
    }

    await page.getByRole('button', { name: /launch dashboard/i }).click();
    await page.waitForURL(/\/(dashboard\/map|map)$/, { timeout: 20000 });
    await expect(page).not.toHaveURL(/\/dashboard\/onboarding/);
  });
});