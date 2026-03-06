import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import type Mail from 'nodemailer/lib/mailer';

import { env } from '@config/env';
import { IMailerService } from '@domain/services/mailer-service';

type SmtpSendInfo = SMTPTransport.SentMessageInfo & {
  accepted?: Array<string | Mail.Address>;
  rejected?: Array<string | Mail.Address>;
};

function toAddressString(value: string | Mail.Address): string {
  return typeof value === 'string' ? value : value.address;
}

export class NodemailerService implements IMailerService {
  private transporter: nodemailer.Transporter<SmtpSendInfo>;

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
    } as SMTPTransport.Options) as nodemailer.Transporter<SmtpSendInfo>;
  }

  async sendMail(params: { to: string; subject: string; html: string }): Promise<void> {
    const from = env.EMAIL_FROM || env.SMTP_USER || 'no-reply@example.com';

    const to = String(params.to ?? '').trim();
    if (!to) throw new Error('[mailer] destinatário vazio');

    const info = await this.transporter.sendMail({
      from,
      to,
      subject: params.subject,
      html: params.html,
    });

    const rejectedList = Array.isArray(info.rejected)
      ? info.rejected
          .map(toAddressString)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    if (rejectedList.length > 0) {
      throw new Error(`[mailer] SMTP rejeitou destinatário(s): ${rejectedList.join(', ')}`);
    }

    const acceptedList = Array.isArray(info.accepted)
      ? info.accepted
          .map(toAddressString)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    if (acceptedList.length === 0) {
      throw new Error('[mailer] SMTP não aceitou nenhum destinatário');
    }

    const toLower = to.toLowerCase();
    if (!acceptedList.some((a) => a.toLowerCase().includes(toLower))) {
      throw new Error(`[mailer] SMTP não confirmou aceitação para o destinatário: ${to}`);
    }
  }
}
