import { IUserRepository } from '@domain/repositories/user-repository';
import { ITokenService } from '@domain/services/token-service';
import { verifyPassword } from '@utils/password-generator';
import { AppError } from '@utils/app-error';

type LoginInput = { email: string; password: string };

export class LoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
  ) {}

  async execute({ email, password }: LoginInput) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw AppError.unauthorized('Invalid credentials', 'AUTH_INVALID_CREDENTIALS');
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      throw AppError.unauthorized('Invalid credentials', 'AUTH_INVALID_CREDENTIALS');
    }

    const token = this.tokenService.sign({ sub: user.id, role: user.role });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
