import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  constructor(private readonly config: ConfigService) {}

  async sendPasswordReset(to: string, code: string): Promise<void> {
    const expirationMinutes = this.config.get<number>(
      'PASSWORD_RESET_EXPIRATION_MINUTES',
      30,
    );
    await this.send({
      to,
      subject: 'JP Taxi password reset',
      text: `Your JP Taxi reset code is ${code}. It expires in ${expirationMinutes} minutes.`,
    });
  }

  async sendInvoice(to: string, invoiceNumber: string, pdf: Buffer): Promise<void> {
    await this.send({
      to,
      subject: `JP Taxi invoice ${invoiceNumber}`,
      text: `Your JP Taxi invoice ${invoiceNumber} is attached.`,
      attachments: [{
        filename: `${invoiceNumber}.pdf`,
        content: pdf,
        contentType: 'application/pdf',
      }],
    });
  }

  private async send(message: {
    to: string;
    subject: string;
    text: string;
    attachments?: nodemailer.SendMailOptions['attachments'];
  }): Promise<void> {
    const mode = this.getMailMode();
    if (mode === 'console') {
      console.log(`[MAIL console] To: ${message.to}`);
      console.log(`[MAIL console] Subject: ${message.subject}`);
      console.log(`[MAIL console] ${message.text}`);
      return;
    }

    if (mode === 'resend') {
      await this.sendWithResend(message);
      return;
    }

    const host = this.config.getOrThrow<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT', '587'));
    const user = this.config.getOrThrow<string>('SMTP_USER');
    const pass = this.config.getOrThrow<string>('SMTP_PASS');
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from:
        this.config.get<string>('SMTP_FROM')
        ?? this.config.get<string>('APP_MAIL_FROM')
        ?? 'JP Taxi <noreply@luongvanhungnet.xyz>',
      ...message,
    });
  }

  private async sendWithResend(message: {
    to: string;
    subject: string;
    text: string;
    attachments?: nodemailer.SendMailOptions['attachments'];
  }): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.get<number>('RESEND_READ_TIMEOUT_MS', 15_000),
    );
    try {
      const attachments = message.attachments?.map((attachment) => {
        if (!('filename' in attachment) || !('content' in attachment)) {
          throw new Error('Resend attachments require filename and content');
        }
        const content = Buffer.isBuffer(attachment.content)
          ? attachment.content
          : Buffer.from(String(attachment.content));
        return {
          filename: String(attachment.filename),
          content: content.toString('base64'),
        };
      });
      const response = await fetch(
        this.config.get<string>(
          'RESEND_API_URL',
          'https://api.resend.com/emails',
        ),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.getOrThrow<string>('RESEND_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from:
              this.config.get<string>('APP_MAIL_FROM')
              ?? this.config.get<string>('MAIL_FROM')
              ?? 'JP Taxi <noreply@luongvanhungnet.xyz>',
            to: [message.to],
            subject: message.subject,
            text: message.text,
            ...(attachments?.length ? { attachments } : {}),
          }),
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(
          `Resend returned ${response.status}: ${responseBody || response.statusText}`,
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  private getMailMode(): 'console' | 'smtp' | 'resend' {
    const explicitMode = this.config.get<string>('MAIL_MODE');
    if (explicitMode === 'console' || explicitMode === 'smtp' || explicitMode === 'resend') {
      return explicitMode;
    }
    if (this.config.get<string>('RESEND_API_KEY')) {
      return 'resend';
    }
    if (
      this.config.get<string>('SMTP_HOST')
      && this.config.get<string>('SMTP_USER')
      && this.config.get<string>('SMTP_PASS')
    ) {
      return 'smtp';
    }
    return 'console';
  }
}
