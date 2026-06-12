import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { config } from 'dotenv';
import { join } from 'path';
import { MailService } from '../src/modules/mail/mail.service';
import { MapService } from '../src/modules/map/map.service';
import { ApiExceptionFilter } from '../src/common/api-exception.filter';

config({ path: join(__dirname, '..', '.env') });
config({ path: join(__dirname, '..', '.env.local'), override: true });

export const databaseUrl =
  process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

export const mailOutbox = {
  passwordResets: [] as Array<{ to: string; code: string }>,
  invoices: [] as Array<{ to: string; invoiceNumber: string; pdf: Buffer }>,
};

export async function createTestApp(): Promise<INestApplication> {
  if (process.env.TEST_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  }
  process.env.JWT_SECRET =
    process.env.JWT_SECRET ?? 'e2e-only-secret-with-at-least-32-characters';
  process.env.FRONTEND_URL =
    process.env.FRONTEND_URL ?? 'http://localhost:5173';
  process.env.DISPATCH_SCHEDULER_ENABLED = 'false';

  const { AppModule } = await import('../src/app.module');
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(MapService)
    .useValue({
      route: async () => ({
        distanceMeters: 8_200,
        durationSeconds: 1_500,
        path: [
          [21.028511, 105.852],
          [21.0167, 105.7847],
        ],
      }),
    })
    .overrideProvider(MailService)
    .useValue({
      sendPasswordReset: async (to: string, code: string) => {
        mailOutbox.passwordResets.push({ to, code });
      },
      sendInvoice: async (
        to: string,
        invoiceNumber: string,
        pdf: Buffer,
      ) => {
        mailOutbox.invoices.push({ to, invoiceNumber, pdf });
      },
    })
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  await app.init();
  return app;
}
