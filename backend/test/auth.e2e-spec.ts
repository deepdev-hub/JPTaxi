import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

const describeWithDatabase = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeWithDatabase('seeded authentication (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.JWT_SECRET =
      process.env.JWT_SECRET ?? 'e2e-only-secret-with-at-least-32-characters';
    process.env.FRONTEND_URL = 'http://localhost:5173';
    const { AppModule } = await import('../src/app.module');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
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
});
