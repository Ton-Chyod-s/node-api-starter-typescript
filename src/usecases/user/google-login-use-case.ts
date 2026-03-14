import { IUserRepository } from '@domain/repositories/user-repository';
import { ITokenService } from '@domain/services/token-service';

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
    const { user } = await this.userRepository.upsertByGoogleId({ googleId, email, name });

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
