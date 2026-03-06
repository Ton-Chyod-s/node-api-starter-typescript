import { IUserRepository } from '@domain/repositories/user-repository';
import { User } from '@domain/entities/user';
import { AppError } from '@utils/app-error';

export class MeUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw AppError.unauthorized('Unauthorized', 'UNAUTHORIZED');
    }
    return user;
  }
}
