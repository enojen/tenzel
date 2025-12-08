import { UserNotFoundException } from '../../exceptions';

import type { UserRepository } from '../../domain/repositories/user.repository';

export interface DeleteUserCommandDeps {
  userRepository: UserRepository;
}

export async function deleteUserCommand(
  userId: string,
  deps: DeleteUserCommandDeps,
): Promise<void> {
  const user = await deps.userRepository.findById(userId);

  if (!user || user.isDeleted) {
    throw new UserNotFoundException();
  }

  if (user.isPremium) {
    await deps.userRepository.softDelete(userId);
  } else {
    await deps.userRepository.hardDelete(userId);
  }
}
