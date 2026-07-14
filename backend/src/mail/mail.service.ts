import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const smtpHost = this.config.get<string>('SMTP_HOST');

    if (smtpHost) {
      // Dev / demo: plain SMTP sink such as Maildev (no auth, no TLS).
      // Verification codes are visible in the Maildev web UI.
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(this.config.get('SMTP_PORT') ?? 1025),
        secure: false,
        ignoreTLS: true,
      });
      this.from =
        this.config.get<string>('MAIL_FROM') ??
        'no-reply@ft-transcendence.local';
      this.logger.log(`Mailer using SMTP host ${smtpHost}`);
    } else {
      // Production: Gmail via an app password.
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: this.config.get('GMAIL_USER'),
          pass: this.config.get('GMAIL_APP_PASSWORD'),
        },
      });
      this.from =
        this.config.get<string>('GMAIL_USER') ??
        'no-reply@ft-transcendence.local';
      this.logger.log('Mailer using Gmail service');
    }
  }

  async sendVerificationEmail(to: string, code: string) {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'YOUR VERIFICATION CODE',
      text: `Your code is: ${code}\nValid for 15min`,
    });
  }

  async sendNotice(to: string, subject: string, text: string) {
    await this.transporter.sendMail({ from: this.from, to, subject, text });
  }
}
