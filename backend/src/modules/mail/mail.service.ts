import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  constructor(private readonly config: ConfigService) {}

  async sendPasswordReset(to: string, code: string): Promise<void> {
    await this.send({
      to,
      subject: 'JP Taxi password reset',
      text: `Your JP Taxi reset code is ${code}. It expires in 15 minutes.`,
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
    if (this.config.get<string>('MAIL_MODE') !== 'smtp') {
      console.log(`[MAIL console] To: ${message.to}`);
      console.log(`[MAIL console] Subject: ${message.subject}`);
      console.log(`[MAIL console] ${message.text}`);
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
      from: this.config.get<string>('SMTP_FROM', 'JP Taxi <no-reply@jptaxi.local>'),
      ...message,
    });
  }
}
