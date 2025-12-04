import { User } from '../../domain/entities/user.entity';
import { USER_STATUSES } from '../../domain/value-objects/user-status.vo';
import { UserAlreadyExistsException } from '../../exceptions';
import { userMapper } from '../dto/user.mapper';

import type { CreateUserRequest, UserResponse } from '../../api/user.schemas';
import type { UserRepository } from '../../domain/repositories/user.repository';
import type { PasswordHasher } from '@/shared/infrastructure/crypto';

export interface CreateUserDeps {
  userRepo: UserRepository;
  passwordHasher: PasswordHasher;
}

export async function createUserHandler(
  input: CreateUserRequest,
  deps: CreateUserDeps,
): Promise<UserResponse> {
  const { userRepo, passwordHasher } = deps;

  const exists = await userRepo.findByEmail(input.email);
  if (exists) {
    throw new UserAlreadyExistsException(input.email);
  }

  const passwordHash = await passwordHasher.hash(input.password);

  const user = User.create({
    id: 0, // Placeholder for new entity, real ID comes from DB
    email: input.email,
    name: input.name,
    role: input.role,
    status: USER_STATUSES.INACTIVE,
    isEmailVerified: false,
    passwordHash,
  });

  const created = await userRepo.create(user);

  return userMapper.toResponse(created);
}
