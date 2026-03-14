import { User, type UserRole } from '@domain/entities/user';
import { RegisterRequestDTO } from '@domain/dtos/user/register-request-dto';

export type UserListItemRepository = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type CreateUserData = Omit<RegisterRequestDTO, 'password'> & {
  passwordHash?: string | null;
  googleId?: string | null;
  role?: UserRole;
};

export type UpsertGoogleUserData = {
  googleId: string;
  email: string;
  name: string;
};

export type UpsertFacebookUserData = {
  facebookId: string;
  email: string;
  name: string;
};

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  findByFacebookId(facebookId: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  upsertByGoogleId(data: UpsertGoogleUserData): Promise<{ user: User; created: boolean }>;
  upsertByFacebookId(data: UpsertFacebookUserData): Promise<{ user: User; created: boolean }>;
  updatePasswordHash(userId: string, passwordHash: string): Promise<void>;
  findAll(): Promise<UserListItemRepository[]>;
  incrementTokenVersion(userId: string): Promise<void>;
}
