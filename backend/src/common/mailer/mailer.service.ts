import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService implements OnModuleInit {
  private transporter: nodemailer.Transporter;
  private logger = new Logger(MailerService.name);

  constructor(private config: ConfigService) {
    const host = config.get('SMTP_HOST');
    const port = parseInt(config.get('SMTP_PORT') || '587');
    this.transporter = nodemailer.createTransport({
      host,
      port,
      // 465 = implicit TLS, everything else (587/25) = STARTTLS
      secure: port === 465,
      auth: { user: config.get('SMTP_USER'), pass: config.get('SMTP_PASS') },
      // Without these, nodemailer waits forever if the host filters the port —
      // which hangs the whole HTTP request. Fail fast instead.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  /**
   * Log SMTP reachability at boot so deploy logs show the real status.
   * Fire-and-forget — must never block startup or the health check.
   */
  onModuleInit() {
    const host = this.config.get('SMTP_HOST');
    if (!host) {
      this.logger.warn('SMTP_HOST is not set — emails will not be sent');
      return;
    }
    this.transporter
      .verify()
      .then(() => this.logger.log(`SMTP ready (host=${host})`))
      .catch((err: any) =>
        this.logger.error(
          `SMTP verify failed (host=${host}): ${err?.code ?? ''} ${err?.message ?? err}`,
        ),
      );
  }

  async send(opts: { to: string; subject: string; html: string }) {
    const from = this.config.get('MAIL_FROM');
    if (!from) {
      this.logger.error('MAIL_FROM is not set — refusing to send email');
      return;
    }
    try {
      await this.transporter.sendMail({
        from: `"${this.config.get('MAIL_FROM_NAME') || 'Finlo'}" <${from}>`,
        ...opts,
      });
      this.logger.log(`Email sent to ${opts.to}`);
    } catch (err: any) {
      // Surface code + message explicitly so Render logs are actionable
      // (ETIMEDOUT/ECONNECTION = host blocking SMTP, EAUTH = bad credentials).
      this.logger.error(
        `Failed to send email to ${opts.to}: ${err?.code ?? ''} ${err?.message ?? err}`,
      );
    }
  }
}
