import { userResponseSchema, type UserResponse } from '../../api/user.schemas';
import { User } from '../../domain/entities/user.entity';

import type { DbUser, NewDbUser } from '../../infrastructure/persistence/user.db-schemas';

export const userMapper = {
  /** Domain Entity → Persistence Model (for DB insert) */
  toPersistence(user: User): NewDbUser {
    return {
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
      passwordHash: user.passwordHash,
    };
  },

  /** Persistence Model → Domain Entity */
  toDomain(dbUser: DbUser): User {
    return User.create({
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      status: dbUser.status,
      isEmailVerified: dbUser.isEmailVerified,
      passwordHash: dbUser.passwordHash,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
      deletedAt: dbUser.deletedAt ?? undefined,
    });
  },

  /** Domain Entity → API Response DTO */
  toResponse(user: User): UserResponse {
    const dto: UserResponse = {
      id: user.id as number,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
      createdAt: (user.createdAt ?? new Date()).toISOString(),
      updatedAt: (user.updatedAt ?? new Date()).toISOString(),
    };
    return userResponseSchema.parse(dto);
  },

  /** Persistence Model → API Response DTO (backward compat) */
  toResponseFromDb(dbUser: DbUser): UserResponse {
    return this.toResponse(this.toDomain(dbUser));
  },

  toResponseList(users: User[]): UserResponse[] {
    return users.map((u) => this.toResponse(u));
  },
};
