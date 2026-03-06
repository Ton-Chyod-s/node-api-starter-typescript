import { User, type UserRole } from '@domain/entities/user';
import { RegisterRequestDTO } from '@domain/dtos/user/register-request-dto';

export type UserListItemRepository = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type CreateUserData = Omit<RegisterRequestDTO, 'password'> & { passwordHash: string };

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  updatePasswordHash(userId: string, passwordHash: string): Promise<void>;

  findAll(): Promise<UserListItemRepository[]>;
  updatePasswordHash(userId: string, passwordHash: string): Promise<void>;
  incrementTokenVersion(userId: string): Promise<void>;
}
