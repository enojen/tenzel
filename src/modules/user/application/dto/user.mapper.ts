import { userResponseSchema, type UserResponse } from '../../api/user.schemas';

import type { DbUser } from '../../infrastructure/persistence/user.db-schemas';

export const userMapper = {
  toResponse(dbUser: DbUser): UserResponse {
    const dto: UserResponse = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      status: dbUser.status,
      isEmailVerified: dbUser.isEmailVerified,
      createdAt: dbUser.createdAt.toISOString(),
      updatedAt: dbUser.updatedAt.toISOString(),
    };
    return userResponseSchema.parse(dto);
  },

  toResponseList(dbUsers: DbUser[]): UserResponse[] {
    return dbUsers.map((u) => this.toResponse(u));
  },
};
