export type CreateRefreshTokenInput = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

export type RefreshTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt: Date | null;
};

export interface IRefreshTokenRepository {
  replaceTokenForUser(
    userId: string,
    input: Omit<CreateRefreshTokenInput, 'userId'>,
  ): Promise<RefreshTokenRecord>;

  findValidByTokenHash(tokenHash: string, now?: Date): Promise<RefreshTokenRecord | null>;

  consumeByTokenHash(tokenHash: string, now?: Date): Promise<string | null>;

  deleteByUserId(userId: string): Promise<void>;
}
