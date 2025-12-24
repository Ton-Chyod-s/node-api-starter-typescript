import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

import { env } from '@config/env';
import { IMailerService } from '@domain/services/mailer-service';

export class NodemailerService implements IMailerService {
  private transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;

  constructor() {
    if (!env.SMTP_HOST) {
      throw new Error('SMTP_HOST não configurado');
    }

    const port = env.SMTP_PORT;
    const secure = (env.SMTP_SECURE ?? port === 465) === true;

    const auth =
      env.SMTP_USER && env.SMTP_PASSWORD
        ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
        : undefined;

    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port,
      secure,
      auth,
    } as SMTPTransport.Options);
  }

  async sendMail(params: { to: string; subject: string; html: string }): Promise<void> {
    const from = env.EMAIL_FROM || env.SMTP_USER || 'no-reply@example.com';

    await this.transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
  }
}
