import { PrismaUserRepository } from '@infrastructure/repositories/user-repositories';
import { ListUsersController } from '@interfaces/http/controllers/user/list-users-controller';
import { ListUsersUseCase } from '@usecases/user/list-users-use-case';

export function makeListUsersController() {
  const userRepository = new PrismaUserRepository();
  const listUsersUseCase = new ListUsersUseCase(userRepository);
  return new ListUsersController(listUsersUseCase);
}
