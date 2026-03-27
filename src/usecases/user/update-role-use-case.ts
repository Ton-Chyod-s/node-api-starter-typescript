import { IUserRepository } from '@domain/repositories/user-repository';
import { ICacheService } from '@domain/services/cache-service';
import { UserRole } from '@domain/entities/user';
import { AppError } from '@utils/app-error';
import { userCacheKey } from '@utils/cache-keys';
import { logger } from '@infrastructure/logging/logger';

type UpdateRoleInput = {
  targetUserId: string;
  role: UserRole;
};

type UpdateRoleOutput = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export class UpdateUserRoleUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly cacheService: ICacheService,
  ) {}

  async execute({ targetUserId, role }: UpdateRoleInput): Promise<UpdateRoleOutput> {
    const user = await this.userRepository.findById(targetUserId);
    if (!user) {
      throw AppError.notFound('User not found', 'USER_NOT_FOUND');
    }

    if (user.role === role) {
      return { id: user.id, name: user.name, email: user.email, role: user.role };
    }

    await this.userRepository.updateRole(targetUserId, role);

    try {
      await this.cacheService.del(userCacheKey(targetUserId));
    } catch (err) {
      logger.warn('Failed to invalidate cache after role update', {
        userId: targetUserId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return { id: user.id, name: user.name, email: user.email, role };
  }
}
