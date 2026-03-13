import { IUserRepository } from '@domain/repositories/user-repository';
import { ITokenService } from '@domain/services/token-service';
import { AppError } from '@utils/app-error';

type GoogleUserInfo = {
  googleId: string;
  email: string;
  name: string;
};

export class GoogleLoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
  ) {}

  async execute({ googleId, email, name }: GoogleUserInfo) {
    let user = await this.userRepository.findByGoogleId(googleId);

    if (!user) {
      const existing = await this.userRepository.findByEmail(email);

      if (existing) {
        throw AppError.conflict(
          'An account with this email already exists. Please log in with your password.',
          'AUTH_EMAIL_ALREADY_EXISTS',
        );
      }

      user = await this.userRepository.create({
        name,
        email: email.trim().toLowerCase(),
        googleId,
      });
    }

    const token = this.tokenService.sign({
      sub: user.id,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

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
