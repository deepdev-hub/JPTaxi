import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailService } from './mail.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

describe('MailService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends password reset mail through Resend when configured', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response('{}', { status: 200 }),
    );
    const service = new MailService(new ConfigService({
      MAIL_MODE: 'resend',
      RESEND_API_KEY: 'resend-test-key',
      RESEND_API_URL: 'https://api.resend.test/emails',
      RESEND_READ_TIMEOUT_MS: 15_000,
      APP_MAIL_FROM: 'JP Taxi <noreply@luongvanhungnet.xyz>',
      MAIL_FROM: 'JP Taxi <noreply@luongvanhungnet.xyz>',
      PASSWORD_RESET_EXPIRATION_MINUTES: 30,
    }));

    await service.sendPasswordReset('customer@example.com', '123456');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.test/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer resend-test-key',
          'Content-Type': 'application/json',
        }),
      }),
    );
    const body = JSON.parse(
      String(fetchMock.mock.calls[0][1]?.body),
    ) as Record<string, unknown>;
    expect(body).toMatchObject({
      from: 'JP Taxi <noreply@luongvanhungnet.xyz>',
      to: ['customer@example.com'],
      subject: 'JP Taxi password reset',
    });
    expect(body.text).toContain('30 minutes');
  });

  it('sends password reset mail through Resend using Spring-style APP_MAIL_FROM', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response('{}', { status: 200 }),
    );
    const service = new MailService(new ConfigService({
      RESEND_API_KEY: 'resend-test-key',
      RESEND_API_URL: 'https://api.resend.test/emails',
      RESEND_READ_TIMEOUT_MS: 15_000,
      APP_MAIL_FROM: 'JP Taxi <noreply@luongvanhungnet.xyz>',
      PASSWORD_RESET_EXPIRATION_MINUTES: 30,
    }));

    await service.sendPasswordReset('customer@example.com', '654321');

    const body = JSON.parse(
      String(fetchMock.mock.calls[0][1]?.body),
    ) as Record<string, unknown>;
    expect(body).toMatchObject({
      from: 'JP Taxi <noreply@luongvanhungnet.xyz>',
      to: ['customer@example.com'],
    });
  });

  it('keeps console mode when no mail provider is configured', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const fetchSpy = jest.spyOn(global, 'fetch');
    const service = new MailService(new ConfigService({
      MAIL_MODE: 'console',
    }));

    await service.sendPasswordReset('customer@example.com', '111111');

    expect(logSpy).toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('selects smtp automatically when SMTP credentials exist without MAIL_MODE', async () => {
    const sendMail = jest.fn().mockResolvedValue({});
    const createTransport = nodemailer.createTransport as jest.Mock;
    createTransport.mockReturnValue({ sendMail } as never);
    const service = new MailService(new ConfigService({
      MAIL_MODE: 'smtp',
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      SMTP_USER: 'smtp-user',
      SMTP_PASS: 'smtp-pass',
      SMTP_FROM: 'JP Taxi <noreply@luongvanhungnet.xyz>',
      APP_MAIL_FROM: 'JP Taxi <noreply@luongvanhungnet.xyz>',
    }));

    await service.sendPasswordReset('customer@example.com', '222222');

    expect(createTransport).toHaveBeenCalled();
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'JP Taxi <noreply@luongvanhungnet.xyz>',
        to: 'customer@example.com',
      }),
    );
  });
});
