import { IUserRepository, CreateUserData } from '@domain/repositories/user-repository';
import { RegisterRequestDTO } from '@domain/dtos/user/register-request-dto';
import { User } from '@domain/entities/user';
import { hashPassword } from '@utils/password-generator';
import { AppError } from '@utils/app-error';

export class CreateUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(input: RegisterRequestDTO): Promise<User> {
    const normalizedEmail = input.email.trim().toLowerCase();

    const { password, ...data } = { ...input, email: normalizedEmail };

    const existing = await this.userRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw AppError.conflict('User already exists', 'USER_ALREADY_EXISTS');
    }

    const passwordHash = await hashPassword(password);

    const createData = {
      ...data,
      passwordHash,
    } satisfies CreateUserData;

    return this.userRepository.create(createData);
  }
}
