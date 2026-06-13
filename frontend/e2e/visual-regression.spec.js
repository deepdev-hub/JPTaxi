import { expect, test } from '@playwright/test';

async function loginCustomer(page) {
  await page.addInitScript(() => {
    localStorage.setItem('jpTaxiLanguage', 'ja');
  });
  await page.goto('/login');
  await page.locator('#emailInput').fill('customer@jptaxi.local');
  await page.locator('.auth-card input[type="password"]').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/home$/);
}

test('matches the customer home layout on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginCustomer(page);
  await expect(page.getByRole('heading').first()).toBeVisible();
  await expect(page).toHaveScreenshot('customer-home-desktop.png', {
    fullPage: true,
  });
});

test('matches the customer home layout on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginCustomer(page);
  await expect(page.getByRole('heading').first()).toBeVisible();
  await expect(page).toHaveScreenshot('customer-home-mobile.png', {
    fullPage: true,
  });
});
