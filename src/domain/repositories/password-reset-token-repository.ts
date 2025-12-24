export type CreatePasswordResetTokenInput = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

export type PasswordResetTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt: Date | null;
};

export interface IPasswordResetTokenRepository {
  deleteAllForUser(userId: string): Promise<void>;

  create(input: CreatePasswordResetTokenInput): Promise<PasswordResetTokenRecord>;

  findValidByTokenHash(tokenHash: string, now?: Date): Promise<PasswordResetTokenRecord | null>;

  markUsed(id: string, usedAt?: Date): Promise<void>;
}
