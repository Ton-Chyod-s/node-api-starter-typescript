import * as jwt from 'jsonwebtoken';
import { ITokenService, TokenPayload } from '@domain/services/token-service';

type JwtConfig = {
  secret: jwt.Secret;
  expiresIn: jwt.SignOptions['expiresIn'];
  issuer: string;
  audience: string;
  algorithm?: jwt.Algorithm;
};

const DEFAULT_ALG: jwt.Algorithm = 'HS256';
const ALLOWED_ROLES = new Set(['USER', 'ADMIN']);

export class JwtTokenService implements ITokenService {
  constructor(private readonly config: JwtConfig) {}

  sign(payload: TokenPayload): string {
    return jwt.sign({ role: payload.role }, this.config.secret, {
      subject: payload.sub,
      expiresIn: this.config.expiresIn,
      algorithm: this.config.algorithm ?? DEFAULT_ALG,
      issuer: this.config.issuer,
      audience: this.config.audience,
    });
  }

  verify(token: string): TokenPayload {
    const decoded = jwt.verify(token, this.config.secret, {
      algorithms: [this.config.algorithm ?? DEFAULT_ALG],
      issuer: this.config.issuer,
      audience: this.config.audience,
    });

    if (!decoded || typeof decoded !== 'object') {
      throw new jwt.JsonWebTokenError('Token inválido');
    }

    const payload = decoded as jwt.JwtPayload;

    const subRaw = payload.sub;
    if (typeof subRaw !== 'string' && typeof subRaw !== 'number') {
      throw new jwt.JsonWebTokenError('Token com subject inválido');
    }
    const sub = String(subRaw);

    if (!sub) throw new jwt.JsonWebTokenError('Token sem subject (sub)');

    const roleRaw = (payload as unknown as { role?: unknown }).role;
    if (typeof roleRaw !== 'string' || !ALLOWED_ROLES.has(roleRaw)) {
      throw new jwt.JsonWebTokenError('Token com role inválida');
    }

    return { sub, role: roleRaw as TokenPayload['role'] };
  }
}
