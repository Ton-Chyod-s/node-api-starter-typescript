import { User } from '@domain/entities/user';
import { RegisterRequestDTO } from '@domain/dtos/user/register-request-dto';

export type CreateUserData = Omit<RegisterRequestDTO, 'password'> & { passwordHash: string };

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;

  updatePasswordHash(userId: string, passwordHash: string): Promise<void>;
}
