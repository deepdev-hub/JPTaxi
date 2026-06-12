import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

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
      MAIL_FROM: 'JP Taxi <no-reply@example.com>',
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
      from: 'JP Taxi <no-reply@example.com>',
      to: ['customer@example.com'],
      subject: 'JP Taxi password reset',
    });
    expect(body.text).toContain('30 minutes');
  });
});
