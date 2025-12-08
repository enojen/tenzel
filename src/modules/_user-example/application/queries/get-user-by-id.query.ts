import { UserNotFoundException } from '../../exceptions';
import { userMapper } from '../dto/user.mapper';

import type { UserResponse } from '../../api/user.schemas';
import type { UserRepository } from '../../domain/repositories/user.repository';

export interface GetUserByIdDeps {
  userRepo: UserRepository;
}

export async function getUserByIdQuery(id: number, deps: GetUserByIdDeps): Promise<UserResponse> {
  const user = await deps.userRepo.findById(id);
  if (!user) {
    throw new UserNotFoundException();
  }
  return userMapper.toResponse(user);
}
