import { expect, test } from '@playwright/test';

async function login(page, { email, password = 'password123', role }) {
  await page.addInitScript(() => {
    localStorage.setItem('jpTaxiLanguage', 'en');
  });
  await page.goto('/login');
  if (role === 'driver') {
    await page.getByRole('tab', { name: 'Driver' }).click();
  }
  await page.locator('#emailInput').fill(email);
  await page.locator('.auth-card input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

test.describe.serial('seeded customer and driver business flow', () => {
  test('accepts, pays, issues an invoice and rates a ride', async ({ browser }) => {
    const customerContext = await browser.newContext();
    const driverContext = await browser.newContext();
    const customerPage = await customerContext.newPage();
    const driverPage = await driverContext.newPage();

    await login(customerPage, {
      email: 'customer2@jptaxi.local',
      role: 'customer',
    });
    await login(driverPage, {
      email: 'driver2@jptaxi.local',
      role: 'driver',
    });

    await driverPage.goto('/xacnhancuocxe');
    await expect(
      driverPage.getByRole('heading', { name: 'Ride request confirmation' }),
    ).toBeVisible();
    await driverPage.getByRole('button', { name: 'Accept' }).click();
    await expect(driverPage).toHaveURL(/\/driver-ride-status$/);

    await customerPage.goto('/ride-confirm');
    await expect(
      customerPage.getByRole('heading', { name: 'Ride confirmation' }),
    ).toBeVisible();
    await expect(
      customerPage.getByText('Verify the license plate and driver name before boarding.'),
    ).toBeVisible();

    await driverPage.getByRole('button', { name: 'Request payment' }).click();
    await expect(
      driverPage.getByText('Payment request sent to the customer.'),
    ).toBeVisible();

    await customerPage.goto('/payment');
    await expect(
      customerPage.getByRole('heading', { name: 'Destination reached' }),
    ).toBeVisible();
    await customerPage.getByRole('button', { name: 'Change' }).click();
    await customerPage.getByRole('button', { name: 'PayPay' }).click();
    await customerPage.getByRole('button', { name: 'Use this method' }).click();
    await customerPage.getByLabel('Account password').fill('password123');
    await customerPage
      .getByRole('button', { name: 'Confirm payment' })
      .click();

    await expect(customerPage).toHaveURL(/\/invoice\?tripId=\d+$/);
    await expect(customerPage.getByText('Issued')).toBeVisible();
    await expect(customerPage.getByText('PAYPAY')).toBeVisible();
    await customerPage.getByRole('link', { name: 'Rate driver' }).click();

    await expect(
      customerPage.getByText('How was your ride?'),
    ).toBeVisible();
    await customerPage.getByRole('button', { name: '5.0 stars' }).click();
    await customerPage.getByRole('button', { name: 'Safe driving' }).click();
    await customerPage
      .getByPlaceholder('Message to the driver (optional)')
      .fill('E2E verified ride.');
    await customerPage.getByRole('button', { name: 'Submit rating' }).click();
    await expect(customerPage).toHaveURL(/\/home$/);

    await customerContext.close();
    await driverContext.close();
  });
});
