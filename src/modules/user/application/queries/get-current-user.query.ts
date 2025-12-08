import { UserNotFoundException } from '../../exceptions';

import type { User } from '../../domain/entities/user.entity';
import type { UserRepository } from '../../domain/repositories/user.repository';

export interface GetCurrentUserQueryDeps {
  userRepository: UserRepository;
}

export async function getCurrentUserQuery(
  userId: string,
  deps: GetCurrentUserQueryDeps,
): Promise<User> {
  const user = await deps.userRepository.findById(userId);

  if (!user || user.isDeleted) {
    throw new UserNotFoundException();
  }

  return user;
}
