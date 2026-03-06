import { PrismaUserRepository } from '@infrastructure/repositories/user-repositories';
import { MeUseCase } from '@usecases/user/me-use-case';
import { MeController } from '@interfaces/http/controllers/user/me-controller';

export function makeMeController() {
  const userRepository = new PrismaUserRepository();
  const meUseCase = new MeUseCase(userRepository);
  return new MeController(meUseCase);
}
