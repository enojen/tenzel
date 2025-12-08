import { Elysia } from 'elysia';

import { userController } from './api/user.controller';

import type { UserRepository } from './domain/repositories/user.repository';

export interface UserModuleDeps {
  userRepository: UserRepository;
}

export function createUserModule(deps: UserModuleDeps) {
  return new Elysia({ prefix: '/users', tags: ['Users'] }).use(
    userController({ userRepository: deps.userRepository }),
  );
}

export { User, type UserProps } from './domain';
export { TrackedAsset, type TrackedAssetProps } from './domain';
export { ACCOUNT_TIERS, type AccountTier } from './domain';
export { ASSET_TYPES, type AssetType } from './domain';
export type { UserRepository, CreateUserDto, UpdateUserDto, AddTrackedAssetDto } from './domain';

export { UserRepository as DrizzleUserRepository } from './infrastructure';

export * from './api/user.schemas';
export { userController, type UserControllerDeps } from './api/user.controller';
export { UserNotFoundException, AssetNotFoundException } from './exceptions';
