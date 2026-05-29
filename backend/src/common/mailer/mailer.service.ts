import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;
  private logger = new Logger(MailerService.name);

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST'),
      port: parseInt(config.get('SMTP_PORT') || '587'),
      secure: false,
      auth: { user: config.get('SMTP_USER'), pass: config.get('SMTP_PASS') },
    });
  }

  async send(opts: { to: string; subject: string; html: string }) {
    try {
      await this.transporter.sendMail({
        from: `"${this.config.get('MAIL_FROM_NAME') || 'Finlo'}" <${this.config.get('MAIL_FROM')}>`,
        ...opts,
      });
      this.logger.log(`Email sent to ${opts.to}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${opts.to}`, err);
    }
  }
}
