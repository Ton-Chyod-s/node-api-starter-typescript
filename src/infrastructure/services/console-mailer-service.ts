import type { IMailerService } from '@domain/services/mailer-service';
import { env } from '@config/env';

export class ConsoleMailerService implements IMailerService {
  async sendMail(params: { to: string; subject: string; html: string }): Promise<void> {
    const { to, subject, html } = params;

    const linkMatch = html.match(/href=["']([^"']+)["']/i);
    const link = linkMatch?.[1];

    if (env.NODE_ENV === 'production') return;

    const lines = [
      '[mailer:console] E-mail não enviado (fallback).',
      `to: ${to}`,
      `subject: ${subject}`,
    ];

    if (link) {
      lines.push(`resetLink: ${link}`);
    } else {
      lines.push('html: (sem link detectado)');
    }

    console.log(lines.join('\n'));
  }
}
