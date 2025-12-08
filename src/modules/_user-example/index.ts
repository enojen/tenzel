export { createUserModule } from './user.module';

export { User, type UserProps, USER_ROLES, USER_STATUSES } from './domain';
export type { UserRepository, FindAllOptions, UserRole, UserStatus } from './domain';

export {
  usersTable,
  userRoleEnum,
  userStatusEnum,
  DrizzleUserRepository,
  type DbUser,
  type NewDbUser,
} from './infrastructure/persistence';
