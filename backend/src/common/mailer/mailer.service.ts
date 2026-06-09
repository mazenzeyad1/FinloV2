import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Sends transactional email.
 *
 * Prefers Brevo's HTTP API (HTTPS/443) when BREVO_API_KEY is set — cloud hosts
 * like Render block outbound SMTP, so the HTTP API is the reliable path in prod.
 * Falls back to SMTP (via nodemailer) for local dev where SMTP works fine.
 */
@Injectable()
export class MailerService implements OnModuleInit {
  private transporter: nodemailer.Transporter | null = null;
  private logger = new Logger(MailerService.name);

  constructor(private config: ConfigService) {
    const host = config.get('SMTP_HOST');
    if (host) {
      const port = parseInt(config.get('SMTP_PORT') || '587');
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // 465 = implicit TLS, else STARTTLS
        auth: { user: config.get('SMTP_USER'), pass: config.get('SMTP_PASS') },
        // Fail fast instead of hanging the request if the port is blocked.
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      });
    }
  }

  onModuleInit() {
    const usingApi = !!this.config.get('BREVO_API_KEY');
    const mode = usingApi ? 'Brevo HTTP API' : this.transporter ? 'SMTP' : 'NONE';
    this.logger.log(`Mailer transport: ${mode}`);

    // Only verify SMTP when it's actually the active transport.
    if (!usingApi && this.transporter) {
      this.transporter
        .verify()
        .then(() => this.logger.log('SMTP ready'))
        .catch((err: any) =>
          this.logger.error(
            `SMTP verify failed: ${err?.code ?? ''} ${err?.message ?? err}`,
          ),
        );
    }
    if (mode === 'NONE') {
      this.logger.warn('No mail transport configured — emails will not be sent');
    }
  }

  async send(opts: { to: string; subject: string; html: string }) {
    const from = this.config.get('MAIL_FROM');
    const fromName = this.config.get('MAIL_FROM_NAME') || 'Finlo';
    if (!from) {
      this.logger.error('MAIL_FROM is not set — refusing to send email');
      return;
    }

    const apiKey = this.config.get('BREVO_API_KEY');
    if (apiKey) {
      await this.sendViaBrevoApi(apiKey, from, fromName, opts);
      return;
    }

    if (!this.transporter) {
      this.logger.error(
        'No mail transport configured (set BREVO_API_KEY for prod or SMTP_* for local)',
      );
      return;
    }

    try {
      await this.transporter.sendMail({ from: `"${fromName}" <${from}>`, ...opts });
      this.logger.log(`Email sent to ${opts.to} via SMTP`);
    } catch (err: any) {
      this.logger.error(
        `Failed to send email to ${opts.to} via SMTP: ${err?.code ?? ''} ${err?.message ?? err}`,
      );
    }
  }

  /** Brevo transactional email over HTTPS — bypasses outbound SMTP blocks. */
  private async sendViaBrevoApi(
    apiKey: string,
    from: string,
    fromName: string,
    opts: { to: string; subject: string; html: string },
  ) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: fromName, email: from },
          to: [{ email: opts.to }],
          subject: opts.subject,
          htmlContent: opts.html,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.error(
          `Failed to send email to ${opts.to} via Brevo API: ${res.status} ${body}`,
        );
        return;
      }
      this.logger.log(`Email sent to ${opts.to} via Brevo API`);
    } catch (err: any) {
      this.logger.error(
        `Failed to send email to ${opts.to} via Brevo API: ${err?.message ?? err}`,
      );
    }
  }
}
