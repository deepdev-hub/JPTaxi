import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, databaseUrl, mailOutbox } from './test-app';
import { RideService } from '../src/modules/ride/ride.service';

jest.setTimeout(120_000);

const describeWithDatabase = databaseUrl ? describe : describe.skip;

describeWithDatabase('main business flows (e2e)', () => {
  let app: INestApplication;
  let customerToken: string;
  let driverToken: string;
  let tripId: number;
  let conversationId: number;
  let paymentMethodId: number;
  let fareVnd: number;
  let dataSource: DataSource;
  let rides: RideService;

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
    rides = app.get(RideService);
    await rides.processDispatchCycle();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('lets the seeded driver accept the ride shown in the pending queue', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        role: 'driver',
        email: 'driver2@jptaxi.local',
        password: 'password123',
      })
      .expect(201);

    driverToken = login.body.token;
    const auth = { Authorization: `Bearer ${driverToken}` };
    await request(app.getHttpServer())
      .get('/api/rides/driver/pending')
      .set(auth)
      .expect(200)
      .expect(({ body }) => {
        expect(body.request.requestId).toBe(2);
      });

    await request(app.getHttpServer())
      .post('/api/rides/driver/accept/2')
      .set(auth)
      .expect(201)
      .expect(({ body }) => {
        expect(body.tripId).toEqual(expect.any(Number));
        tripId = body.tripId;
      });
  });

  it('rejects payment until the driver requests it', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        role: 'customer',
        email: 'customer2@jptaxi.local',
        password: 'password123',
      })
      .expect(201);

    customerToken = login.body.token;
    await request(app.getHttpServer())
      .post('/api/rides/payment')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        tripId,
        paymentMethod: 'VNPAY',
        idempotencyKey: `before-request-${tripId}`,
        password: 'password123',
      })
      .expect(400);
  });

  it('loads and updates customer-owned settings without exposing card secrets', async () => {
    const auth = { Authorization: `Bearer ${customerToken}` };
    await request(app.getHttpServer())
      .get('/api/customers/me/profile')
      .set(auth)
      .expect(200)
      .expect(({ body }) => {
        expect(body.email).toBe('customer2@jptaxi.local');
      });

    await request(app.getHttpServer())
      .put('/api/customers/me/saved-places/favorite')
      .set(auth)
      .send({
        type: 'favorite',
        label: 'Airport',
        address: 'Noi Bai International Airport',
        latitude: 21.2187,
        longitude: 105.8042,
      })
      .expect(200);

    await request(app.getHttpServer())
      .put('/api/customers/me/notification-preferences')
      .set(auth)
      .send({
        rideUpdates: true,
        emailNotifications: true,
        promotions: false,
      })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/customers/me/payment-methods')
      .set(auth)
      .send({
        brand: 'MASTER',
        holderName: 'TRAN MAI',
        cardNumber: '5555555555554444',
        securityCode: '123',
        expiryMonth: 12,
        expiryYear: 2030,
        isDefault: true,
      })
      .expect(201)
      .expect(({ body }) => {
        paymentMethodId = body.paymentMethodId;
        expect(body.lastFour).toBe('4444');
        expect(body).not.toHaveProperty('providerToken');
        expect(body).not.toHaveProperty('cardNumber');
        expect(body).not.toHaveProperty('securityCode');
      });
  });

  it('supports chat only for the customer and driver on the ongoing trip', async () => {
    const customerAuth = { Authorization: `Bearer ${customerToken}` };
    const driverAuth = { Authorization: `Bearer ${driverToken}` };

    await request(app.getHttpServer())
      .get('/api/rides/active')
      .set(customerAuth)
      .expect(200)
      .expect(({ body }) => {
        expect(body.type).toBe('trip');
        expect(body.data.tripId).toBe(tripId);
        fareVnd = body.data.finalFareVnd;
      });

    await request(app.getHttpServer())
      .post('/api/messages/conversations')
      .set(customerAuth)
      .send({ peerRole: 'driver', peerId: 2, requestId: 2 })
      .expect(201)
      .expect(({ body }) => {
        conversationId = body.conversationId;
      });

    await request(app.getHttpServer())
      .post(`/api/messages/conversations/${conversationId}/messages`)
      .set(customerAuth)
      .send({ body: 'I am ready at the pickup point.' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/messages/conversations/${conversationId}/messages`)
      .set(driverAuth)
      .expect(200)
      .expect(({ body }) => {
        expect(body.items.at(-1).body).toBe(
          'I am ready at the pickup point.',
        );
        expect(body.items.at(-1).isMine).toBe(false);
      });
  });

  it('requests payment, verifies password and creates one transaction and payout', async () => {
    const driverAuth = { Authorization: `Bearer ${driverToken}` };
    const customerAuth = { Authorization: `Bearer ${customerToken}` };
    const idempotencyKey = `trip-${tripId}-payment`;

    await request(app.getHttpServer())
      .post(`/api/rides/driver/request-payment/${tripId}`)
      .set(driverAuth)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/rides/payment')
      .set(customerAuth)
      .send({
        tripId,
        paymentMethod: 'MASTER',
        paymentMethodId,
        idempotencyKey,
        password: 'wrong-password',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/rides/payment')
      .set(customerAuth)
      .send({
        tripId,
        paymentMethod: 'MASTER',
        paymentMethodId,
        idempotencyKey,
        password: 'password123',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.status).toBe('completed');
        expect(body.idempotent).toBe(false);
      });

    await request(app.getHttpServer())
      .post('/api/rides/payment')
      .set(customerAuth)
      .send({
        tripId,
        paymentMethod: 'MASTER',
        paymentMethodId,
        idempotencyKey,
        password: 'password123',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.idempotent).toBe(true);
      });

    await request(app.getHttpServer())
      .get('/api/drivers/me/payouts')
      .set(driverAuth)
      .expect(200)
      .expect(({ body }) => {
        const payout = body.items.find(
          (item: { tripId: number }) => item.tripId === tripId,
        );
        expect(payout.grossFareVnd).toBe(fareVnd);
        expect(payout.commissionVnd).toBe(Math.round(fareVnd * 0.2));
        expect(payout.amountVnd).toBe(
          fareVnd - Math.round(fareVnd * 0.2),
        );
        expect(payout.status).toBe('processed');
      });
  });

  it('issues, downloads and emails the persisted invoice', async () => {
    const auth = { Authorization: `Bearer ${customerToken}` };

    await request(app.getHttpServer())
      .get(`/api/trips/${tripId}/invoice`)
      .set(auth)
      .expect(200)
      .expect(({ body }) => {
        expect(body.canIssue).toBe(true);
      });

    const issueResponses = await Promise.all([
      request(app.getHttpServer())
        .post('/api/invoice/issue')
        .set(auth)
        .send({ tripId, recipientEmail: 'customer2@jptaxi.local' }),
      request(app.getHttpServer())
        .post('/api/invoice/issue')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ tripId }),
    ]);
    expect(issueResponses.map(({ status }) => status)).toEqual([201, 201]);
    expect(issueResponses.map(({ body }) => body.alreadyIssued).sort()).toEqual([
      false,
      true,
    ]);
    issueResponses.forEach(({ body }) => {
      expect(body.invoice.tripId).toBe(tripId);
    });

    await request(app.getHttpServer())
      .get(`/api/invoice/pdf?tripId=${tripId}`)
      .set(auth)
      .expect('Content-Type', /application\/pdf/)
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/invoice/email')
      .set(auth)
      .send({ tripId, recipientEmail: 'customer2@jptaxi.local' })
      .expect(201);

    expect(mailOutbox.invoices).toHaveLength(1);
    expect(mailOutbox.invoices[0].to).toBe('customer2@jptaxi.local');
    expect(mailOutbox.invoices[0].pdf.subarray(0, 4).toString()).toBe(
      '%PDF',
    );
  });

  it('stores rating tags and exposes the result to the driver', async () => {
    await request(app.getHttpServer())
      .post(`/api/trips/${tripId}/rating`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        score: 5,
        tags: ['safe_driving', 'polite'],
        comment: 'Excellent ride.',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.rating.tags).toEqual(['safe_driving', 'polite']);
      });

    await request(app.getHttpServer())
      .get('/api/drivers/me/ratings')
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(
          body.items.some(
            (item: { tripId: number; score: number }) =>
              item.tripId === tripId && item.score === 5,
          ),
        ).toBe(true);
      });
  });

  it('prevents another customer from reading the trip invoice', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        role: 'customer',
        email: 'customer@jptaxi.local',
        password: 'password123',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/trips/${tripId}/invoice`)
      .set('Authorization', `Bearer ${login.body.token}`)
      .expect(403);
  });

  it('prevents a pending driver from going online', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        role: 'driver',
        email: 'driver.pending@jptaxi.local',
        password: 'password123',
      })
      .expect(201);

    await request(app.getHttpServer())
      .put('/api/drivers/me/availability')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ isOnline: true })
      .expect(400);
  });

  it('registers a customer and completes change and reset password flows', async () => {
    const email = 'e2e.customer@jptaxi.local';
    const registration = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        role: 'customer',
        first_name: 'Test',
        last_name: 'Customer',
        email,
        password: 'initial123',
        phone: '0901999999',
        gender: 'Other',
        birth_date: '1998-01-02',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${registration.body.token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.email).toBe(email);
      });

    await request(app.getHttpServer())
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${registration.body.token}`)
      .send({
        currentPassword: 'initial123',
        newPassword: 'changed123',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .send({ email })
      .expect(201)
      .expect(({ body }) => {
        expect(body).not.toHaveProperty('code');
        expect(body).not.toHaveProperty('token');
      });

    const reset = mailOutbox.passwordResets.find((item) => item.to === email);
    expect(reset?.code).toMatch(/^\d{6}$/);

    await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send({
        email,
        code: reset?.code,
        newPassword: 'reset1234',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ role: 'customer', email, password: 'changed123' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ role: 'customer', email, password: 'reset1234' })
      .expect(201);
  });

  it('books with server pricing and supports driver replacement and customer cancellation', async () => {
    const customerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        role: 'customer',
        email: 'customer2@jptaxi.local',
        password: 'password123',
      })
      .expect(201);
    const driverLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        role: 'driver',
        email: 'driver@jptaxi.local',
        password: 'password123',
      })
      .expect(201);
    const customerAuth = {
      Authorization: `Bearer ${customerLogin.body.token}`,
    };
    const driverAuth = {
      Authorization: `Bearer ${driverLogin.body.token}`,
    };
    const ride = {
      pickupAddress: 'Hoan Kiem Lake, Hanoi',
      pickupLat: 21.028511,
      pickupLng: 105.852,
      dropoffAddress: 'Keangnam Landmark 72, Hanoi',
      dropoffLat: 21.0167,
      dropoffLng: 105.7847,
      vehicleType: '4',
      noteToDriver: 'Please call on arrival.',
    };

    await request(app.getHttpServer())
      .post('/api/rides/estimate')
      .set(customerAuth)
      .send({
        startLat: ride.pickupLat,
        startLng: ride.pickupLng,
        endLat: ride.dropoffLat,
        endLng: ride.dropoffLng,
        vehicleType: ride.vehicleType,
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.distanceMeters).toBe(8_200);
        expect(body.totalFareVnd).toBeGreaterThan(0);
      });

    await request(app.getHttpServer())
      .post('/api/rides')
      .set(customerAuth)
      .send({ ...ride, estimatedFareVnd: 1 })
      .expect(400);

    const booking = await request(app.getHttpServer())
      .post('/api/rides')
      .set(customerAuth)
      .send(ride)
      .expect(201);
    expect(booking.body.estimatedFareVnd).toBeGreaterThan(1);
    const requestId = booking.body.requestId as number;
    await rides.processDispatchCycle();
    const originalRequest = await dataSource.query<Array<{
      search_group_id: string;
    }>>(
      'SELECT search_group_id FROM ride_request WHERE request_id = $1',
      [requestId],
    );

    await request(app.getHttpServer())
      .get('/api/rides/driver/pending')
      .set(driverAuth)
      .expect(200)
      .expect(({ body }) => {
        expect(body.request.requestId).toBe(requestId);
      });

    const accepted = await request(app.getHttpServer())
      .post(`/api/rides/driver/accept/${requestId}`)
      .set(driverAuth)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/rides')
      .set(customerAuth)
      .send(ride)
      .expect(400);

    const cancelled = await request(app.getHttpServer())
      .post(`/api/rides/driver/cancel/${accepted.body.tripId}`)
      .set(driverAuth)
      .expect(201);

    expect(cancelled.body.requestId).not.toBe(requestId);
    const replacementState = await dataSource.query<Array<{
      search_group_id: string;
      search_radius_km: number;
    }>>(
      `SELECT search_group_id, search_radius_km
       FROM ride_request
       WHERE request_id = $1`,
      [cancelled.body.requestId],
    );
    const exclusions = await dataSource.query<Array<{
      driver_id: number;
      reason: string;
    }>>(
      `SELECT driver_id, reason
       FROM ride_search_driver_exclusion
       WHERE search_group_id = $1`,
      [originalRequest[0].search_group_id],
    );
    expect(replacementState[0]).toEqual(expect.objectContaining({
      search_group_id: originalRequest[0].search_group_id,
      search_radius_km: 2,
    }));
    expect(exclusions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        driver_id: 1,
        reason: 'cancelled_after_accept',
      }),
    ]));
    await request(app.getHttpServer())
      .post(`/api/rides/cancel/${cancelled.body.requestId}`)
      .set(customerAuth)
      .expect(201)
      .expect(({ body }) => {
        expect(body.status).toBe('failed');
      });
  });

  it('finds a driver about 5 km from the customer only when the radius reaches 5 km', async () => {
    await dataSource.query(`
      UPDATE driver SET is_online = FALSE;
      UPDATE driver
      SET status = 'approved', is_online = TRUE, approved_at = NOW()
      WHERE driver_id = 4;
      INSERT INTO driver_location_history (driver_id, latitude, longitude, recorded_at)
      VALUES (4, 21.073400, 105.852000, NOW());
    `);
    const customerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        role: 'customer',
        email: 'customer@jptaxi.local',
        password: 'password123',
      })
      .expect(201);
    const customerAuth = {
      Authorization: `Bearer ${customerLogin.body.token}`,
    };
    const booking = await request(app.getHttpServer())
      .post('/api/rides')
      .set(customerAuth)
      .send({
        pickupAddress: 'Hoan Kiem Lake, Hanoi',
        pickupLat: 21.028511,
        pickupLng: 105.852,
        dropoffAddress: 'Keangnam Landmark 72, Hanoi',
        dropoffLat: 21.0167,
        dropoffLng: 105.7847,
        vehicleType: '4',
      })
      .expect(201);
    const requestId = booking.body.requestId as number;
    const [row] = await dataSource.query<Array<{ search_started_at: Date }>>(
      'SELECT search_started_at FROM ride_request WHERE request_id = $1',
      [requestId],
    );
    const startedAt = new Date(row.search_started_at);

    for (const elapsed of [0, 2_000, 4_000]) {
      await rides.processDispatchCycle(new Date(startedAt.getTime() + elapsed));
      const offers = await dataSource.query<Array<{ radius_km: number }>>(
        'SELECT radius_km FROM ride_request_dispatch WHERE request_id = $1',
        [requestId],
      );
      expect(offers).toHaveLength(0);
    }

    await rides.processDispatchCycle(new Date(startedAt.getTime() + 6_000));
    const offers = await dataSource.query<Array<{
      driver_id: number;
      radius_km: number;
    }>>(
      `SELECT driver_id, radius_km
       FROM ride_request_dispatch
       WHERE request_id = $1`,
      [requestId],
    );
    expect(offers).toEqual([{
      driver_id: 4,
      radius_km: 5,
    }]);
  });

  it('fails a stale searching request so the customer can create a new booking', async () => {
    const uniqueSuffix = Date.now();
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        role: 'customer',
        first_name: 'Stale',
        last_name: 'Case',
        email: `customer.stale.${uniqueSuffix}@jptaxi.local`,
        phone: `0901${String(uniqueSuffix).slice(-6)}`,
        gender: 'Other',
        birth_date: '1990-01-01',
        password: 'password123',
      })
      .expect(201);

    const customerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        role: 'customer',
        email: `customer.stale.${uniqueSuffix}@jptaxi.local`,
        password: 'password123',
      })
      .expect(201);
    const customerAuth = {
      Authorization: `Bearer ${customerLogin.body.token}`,
    };

    const staleRequest = await request(app.getHttpServer())
      .post('/api/rides')
      .set(customerAuth)
      .send({
        pickupAddress: 'Hoan Kiem Lake, Hanoi',
        pickupLat: 21.028511,
        pickupLng: 105.852,
        dropoffAddress: 'Keangnam Landmark 72, Hanoi',
        dropoffLat: 21.0167,
        dropoffLng: 105.7847,
        vehicleType: '4',
      })
      .expect(201);

    await dataSource.query(
      `UPDATE ride_request
       SET search_started_at = NOW() - INTERVAL '3 minute'
       WHERE request_id = $1`,
      [staleRequest.body.requestId],
    );

    const replacement = await request(app.getHttpServer())
      .post('/api/rides')
      .set(customerAuth)
      .send({
        pickupAddress: 'West Lake, Hanoi',
        pickupLat: 21.0589,
        pickupLng: 105.8195,
        dropoffAddress: 'Noi Bai International Airport',
        dropoffLat: 21.2187,
        dropoffLng: 105.8042,
        vehicleType: '4',
      })
      .expect(201);

    expect(replacement.body.requestId).not.toBe(staleRequest.body.requestId);

    const [staleState] = await dataSource.query<Array<{ status: string }>>(
      'SELECT status FROM ride_request WHERE request_id = $1',
      [staleRequest.body.requestId],
    );
    expect(staleState.status).toBe('failed');
  });
});
