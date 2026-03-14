import { IUserRepository } from '@domain/repositories/user-repository';
import { ITokenService } from '@domain/services/token-service';

type FacebookUserInfo = {
  facebookId: string;
  email: string;
  name: string;
};

export class FacebookLoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
  ) {}

  async execute({ facebookId, email, name }: FacebookUserInfo) {
    const { user } = await this.userRepository.upsertByFacebookId({ facebookId, email, name });

    const token = this.tokenService.sign({
      sub: user.id,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    return {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }
}
