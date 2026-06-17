import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, databaseUrl } from './test-app';

jest.setTimeout(120_000);

const describeWithDatabase = databaseUrl ? describe : describe.skip;

describeWithDatabase('seeded authentication (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app?.close();
  });

  it.each([
    ['customer', 'customer@jptaxi.local'],
    ['driver', 'driver@jptaxi.local'],
  ])('logs in the seeded %s and resolves /auth/me', async (role, email) => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ role, email, password: 'password123' })
      .expect(201);

    expect(login.body.token).toEqual(expect.any(String));
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.role).toBe(role);
      });
  });

  it('returns an invalid-credentials code for a failed login', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        role: 'customer',
        email: 'customer@jptaxi.local',
        password: 'wrong-password',
      })
      .expect(401)
      .expect(({ body }) => {
        expect(body.code).toBe('INVALID_CREDENTIALS');
      });
  });

  it('returns a specific message when driver registration reuses an existing license plate', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        role: 'driver',
        first_name: 'New',
        last_name: 'Driver',
        email: 'duplicate-plate@jptaxi.local',
        password: 'password123',
        phone: '0901888888',
        gender: 'Other',
        birth_date: '1995-01-01',
        nationality: 'Vietnam',
        japanese_level: 'N3',
        license_number: 'DL-987654321',
        license_type: 'B',
        license_expiry_date: '2028-01-01',
        vehicle_brand: 'Toyota Vios',
        vehicle_color: 'White',
        vehicle_type: '4',
        license_plate: '30A-100.01',
        portrait_url: '/uploads/portrait.webp',
        japanese_certificate_url: '/uploads/japanese-certificate.webp',
        license_front_url: '/uploads/license-front.webp',
        license_back_url: '/uploads/license-back.webp',
        vehicle_photo_url: '/uploads/vehicle-photo.webp',
        registration_paper_url: '/uploads/registration-paper.webp',
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.code).toBe('BAD_REQUEST');
        expect(body.message).toBe('License plate is already registered');
      });
  });

  it('creates a fresh random 6-digit reset code for each forgot-password request', async () => {
    const first = await request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .send({ email: 'customer@jptaxi.local' })
      .expect(201);

    const second = await request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .send({ email: 'customer@jptaxi.local' })
      .expect(201);

    expect(first.body.message).toBe('If the account exists, a reset code has been sent.');
    expect(second.body.message).toBe('If the account exists, a reset code has been sent.');

    const { mailOutbox } = await import('./test-app');
    const lastTwo = mailOutbox.passwordResets.slice(-2);
    expect(lastTwo).toHaveLength(2);
    expect(lastTwo[0].to).toBe('customer@jptaxi.local');
    expect(lastTwo[1].to).toBe('customer@jptaxi.local');
    expect(lastTwo[0].code).toMatch(/^\d{6}$/);
    expect(lastTwo[1].code).toMatch(/^\d{6}$/);
    expect(lastTwo[0].code).not.toBe(lastTwo[1].code);
  });

  it('records the customer device and exposes owned login history', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('User-Agent', 'JP-Taxi-E2E/1.0')
      .send({
        role: 'customer',
        email: 'customer@jptaxi.local',
        password: 'password123',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/customers/me/login-history')
      .set('Authorization', `Bearer ${login.body.token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(expect.arrayContaining([
          expect.objectContaining({
            userAgent: 'JP-Taxi-E2E/1.0',
            loginTime: expect.any(String),
          }),
        ]));
      });
  });

  it('rejects driver access to customer login history', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        role: 'driver',
        email: 'driver@jptaxi.local',
        password: 'password123',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/customers/me/login-history')
      .set('Authorization', `Bearer ${login.body.token}`)
      .expect(403)
      .expect(({ body }) => {
        expect(body.code).toBe('FORBIDDEN');
      });
  });

  it('rejects an avatar upload without an image file', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        role: 'customer',
        email: 'customer@jptaxi.local',
        password: 'password123',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/uploads/avatar')
      .set('Authorization', `Bearer ${login.body.token}`)
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe('Avatar image is required');
      });
  });

  it('stores and returns insurance owned by the logged-in driver', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        role: 'driver',
        email: 'driver@jptaxi.local',
        password: 'password123',
      })
      .expect(201);
    const auth = { Authorization: `Bearer ${login.body.token}` };

    await request(app.getHttpServer())
      .put('/api/drivers/me/insurance')
      .set(auth)
      .send({
        providerName: 'JP Local Insurance',
        policyNumber: 'POL-2026-001',
        effectiveDate: '2026-06-01',
        expiryDate: '2027-06-01',
        documentUrl: '/uploads/drivers/insurance/policy.webp',
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('active');
        expect(body.insurance.policyNumber).toBe('POL-2026-001');
      });

    await request(app.getHttpServer())
      .get('/api/drivers/me/insurance')
      .set(auth)
      .expect(200)
      .expect(({ body }) => {
        expect(body.insurance.driverId).toBe(1);
      });
  });

  it('auto-approves the local pending driver after a fresh location is stored', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        role: 'driver',
        email: 'driver@gmail.com',
        password: 'password123',
      })
      .expect(201);
    const auth = { Authorization: `Bearer ${login.body.token}` };

    await request(app.getHttpServer())
      .post('/api/rides/driver/location')
      .set(auth)
      .send({ lat: 21.0734, lng: 105.852 })
      .expect(201);

    await request(app.getHttpServer())
      .put('/api/drivers/me/availability')
      .set(auth)
      .send({ isOnline: true })
      .expect(200)
      .expect(({ body }) => {
        expect(body.isOnline).toBe(true);
      });

    await request(app.getHttpServer())
      .get('/api/drivers/me/profile')
      .set(auth)
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('approved');
        expect(body.latestLocation.latitude).toBeCloseTo(21.0734);
      });
  });
});
