import { PrismaUserRepository } from '@infrastructure/repositories/user-repositories';
import { CreateUserUseCase } from '@usecases/user/create-use-case';
import { RegisterController } from '@interfaces/http/controllers/user/register-controller';

export function makeRegisterController() {
  const userRepository = new PrismaUserRepository();
  const createUserUseCase = new CreateUserUseCase(userRepository);
  const controller = new RegisterController(createUserUseCase);

  return controller;
}
