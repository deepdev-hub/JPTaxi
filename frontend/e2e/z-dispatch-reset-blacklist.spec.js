import { expect, test } from '@playwright/test';

async function login(page, { email, role }) {
  await page.addInitScript(() => {
    localStorage.setItem('jpTaxiLanguage', 'en');
  });
  await page.goto('/login');
  if (role === 'driver') {
    await page.getByRole('tab', { name: 'Driver' }).click();
  }
  await page.locator('#emailInput').fill(email);
  await page.locator('.auth-card input[type="password"]').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

async function createRide(page, suffix) {
  const ride = await page.evaluate(async (label) => {
    const session = JSON.parse(localStorage.getItem('jpTaxiSession'));
    const response = await fetch('http://127.0.0.1:3000/api/rides', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pickupAddress: `Hoan Kiem Lake ${label}`,
        pickupLat: 21.028511,
        pickupLng: 105.852,
        dropoffAddress: 'Keangnam Landmark 72, Hanoi',
        dropoffLat: 21.0167,
        dropoffLng: 105.7847,
        vehicleType: '4',
      }),
    });
    if (!response.ok) {
      throw new Error(`Ride creation failed: ${response.status}`);
    }
    return response.json();
  }, suffix);

  await page.evaluate((request) => {
    sessionStorage.setItem('jpTaxiRideRequestId', String(request.requestId));
    sessionStorage.setItem('jpTaxiSelectedRoute', JSON.stringify({
      pickup: {
        name: request.pickupAddress,
        address: request.pickupAddress,
        position: [Number(request.pickupLat), Number(request.pickupLng)],
      },
      destination: {
        name: request.dropoffAddress,
        address: request.dropoffAddress,
        position: [Number(request.dropoffLat), Number(request.dropoffLng)],
      },
      routePath: [],
      routeMetrics: null,
    }));
  }, ride);
  return ride;
}

test('resets, blacklists and times out dispatch offers across both UIs', async ({ browser }) => {
  test.setTimeout(70_000);
  const customerContext = await browser.newContext();
  const driverContext = await browser.newContext();
  const customerPage = await customerContext.newPage();
  const driverPage = await driverContext.newPage();

  await login(customerPage, {
    email: 'customer@jptaxi.local',
    role: 'customer',
  });
  await login(driverPage, {
    email: 'driver@jptaxi.local',
    role: 'driver',
  });

  await createRide(customerPage, 'reject');
  await customerPage.goto('/search-car');
  await driverPage.goto('/xacnhancuocxe');
  await expect(driverPage.getByRole('button', { name: 'Accept' })).toBeVisible({
    timeout: 10_000,
  });

  await driverPage.getByRole('button', { name: 'Reject' }).click();
  await expect(
    driverPage.getByText('Waiting for another request...'),
  ).toBeVisible();
  await expect.poll(async () => {
    const text = await customerPage.locator('.status-card p').textContent();
    return Number(text?.match(/(\d+) km/)?.[1] || 0);
  }, { timeout: 10_000 }).toBeGreaterThanOrEqual(3);
  await expect(driverPage.getByRole('button', { name: 'Accept' })).toHaveCount(0);

  await customerPage
    .getByRole('button', { name: 'Cancel reservation' })
    .click();
  await expect(customerPage).toHaveURL(/\/home$/);

  await createRide(customerPage, 'timeout');
  await customerPage.goto('/search-car');
  await expect(driverPage.getByRole('button', { name: 'Accept' })).toBeVisible({
    timeout: 10_000,
  });

  await expect(
    driverPage.getByText('The offer expired. Waiting for another ride request...'),
  ).toBeVisible({ timeout: 35_000 });
  await expect.poll(async () => {
    const text = await customerPage.locator('.status-card p').textContent();
    return Number(text?.match(/(\d+) km/)?.[1] || 0);
  }, { timeout: 10_000 }).toBeGreaterThanOrEqual(3);
  await expect(driverPage.getByRole('button', { name: 'Accept' })).toHaveCount(0);

  await customerPage
    .getByRole('button', { name: 'Cancel reservation' })
    .click();
  await customerContext.close();
  await driverContext.close();
});
