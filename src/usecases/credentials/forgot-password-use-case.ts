import crypto from 'crypto';

import { IUserRepository } from '@domain/repositories/user-repository';
import { IMailerService } from '@domain/services/mailer-service';
import { IPasswordResetTokenRepository } from '@domain/repositories/password-reset-token-repository';
import { env } from '@config/env';
import { sha256Hex } from '@utils/hash';

function buildResetLink(rawToken: string): string {
  const frontend = env.FRONTEND_URL ?? 'http://localhost:3001';
  const base = frontend.replace(/\/$/, '');

  const template = env.PASSWORD_RESET_PATH;

  const path = template.includes('{token}')
    ? template.replace('{token}', rawToken)
    : `${template.replace(/\/$/, '')}/${rawToken}`;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const link = `${base}${normalizedPath}`;

  const url = new URL(link);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Reset link gerou um esquema inválido: ${url.protocol}`);
  }

  return link;
}

function ttlMinutes(): number {
  return env.PASSWORD_RESET_TOKEN_TTL_MINUTES;
}

export class ForgotPasswordUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly resetTokenRepo: IPasswordResetTokenRepository,
    private readonly mailer: IMailerService,
  ) {}

  async execute(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userRepo.findByEmail(normalizedEmail);
    if (!user) return;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256Hex(rawToken);

    const ttl = ttlMinutes();
    const expiresAt = new Date(Date.now() + ttl * 60 * 1000);

    await this.resetTokenRepo.replaceTokenForUser(user.id, { tokenHash, expiresAt });

    const resetLink = buildResetLink(rawToken);

    await this.mailer.sendMail({
      to: normalizedEmail,
      subject: 'Recuperação de senha',
      html: this.emailHtml(resetLink, ttl),
    });
  }

  private emailHtml(resetLink: string, ttlMinutes: number): string {
    return `
      <p>Olá,</p>
      <p>Você solicitou a recuperação de senha. Clique no link abaixo para redefinir sua senha:</p>
      <p><a href="${resetLink}">Redefinir senha</a></p>
      <p>Este link expira em ${ttlMinutes} minuto(s).</p>
      <p>Se você não solicitou essa alteração, ignore este e-mail.</p>
    `;
  }
}
