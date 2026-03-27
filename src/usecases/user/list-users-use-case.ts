import { IUserRepository, UserListItemRepository, FindAllParams } from '@domain/repositories/user-repository';

export type ListUsersOutput = {
  users: UserListItemRepository[];
  nextCursor: string | null;
};

export class ListUsersUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(params?: FindAllParams): Promise<ListUsersOutput> {
    const take = params?.take ?? 20;
    const users = await this.userRepository.findAll({ take, cursor: params?.cursor });

    const nextCursor = users.length === take ? (users[users.length - 1]?.id ?? null) : null;

    return { users, nextCursor };
  }
}
