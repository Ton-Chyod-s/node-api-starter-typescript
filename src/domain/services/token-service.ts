import type { UserRole } from '@domain/entities/user';

export type TokenPayload = {
  sub: string;
  role: UserRole;
};

export interface ITokenService {
  sign(payload: TokenPayload): string;
  verify(token: string): TokenPayload;
}
