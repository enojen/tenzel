import { asc, count, desc, eq, isNull } from 'drizzle-orm';

import { db } from '../../../../shared/infrastructure/database/drizzle';
import {
  buildPaginationLinks,
  buildPaginationMeta,
  type PaginatedResult,
  type PaginationParams,
  type SortOption,
} from '../../../../shared/types';
import { User } from '../../domain/entities/user.entity';

import { usersTable } from './user.table';

import type { DbUser, NewDbUser } from './user.db-schemas';
import type {
  FindAllOptions,
  UserRepository,
  UserSortField,
} from '../../domain/repositories/user.repository';

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly database: typeof db = db) {}

  async findById(id: number): Promise<User | null> {
    const result = await this.database
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);

    return result[0] ? this.toDomain(result[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.database
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    return result[0] ? this.toDomain(result[0]) : null;
  }

  async create(user: User): Promise<User> {
    const dbUser = this.toDb(user);
    const [created] = await this.database.insert(usersTable).values(dbUser).returning();

    if (!created) {
      throw new Error('Failed to create user');
    }

    return this.toDomain(created);
  }

  async update(user: User): Promise<User> {
    const dbUser = this.toDb(user);
    const [updated] = await this.database
      .update(usersTable)
      .set({
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        status: dbUser.status,
        isEmailVerified: dbUser.isEmailVerified,
        passwordHash: dbUser.passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, user.id as number))
      .returning();

    if (!updated) {
      throw new Error('Failed to update user');
    }

    return this.toDomain(updated);
  }

  async findAll(options?: FindAllOptions): Promise<User[]> {
    const query = this.database
      .select()
      .from(usersTable)
      .where(isNull(usersTable.deletedAt))
      .$dynamic();

    if (options?.orderBy?.length) {
      const orderClauses = this.buildOrderClauses(options.orderBy);
      query.orderBy(...orderClauses);
    }

    if (options?.limit) {
      query.limit(options.limit);
    }

    if (options?.offset) {
      query.offset(options.offset);
    }

    const result = await query;

    return result.map((row) => this.toDomain(row));
  }

  async findAllPaginated(
    options: PaginationParams & { orderBy?: SortOption<{ [K in UserSortField]: unknown }>[] },
  ): Promise<PaginatedResult<User>> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const query = this.database
      .select()
      .from(usersTable)
      .where(isNull(usersTable.deletedAt))
      .$dynamic();

    if (options.orderBy?.length) {
      const orderClauses = this.buildOrderClauses(options.orderBy);
      query.orderBy(...orderClauses);
    } else {
      query.orderBy(desc(usersTable.createdAt));
    }

    query.limit(pageSize).offset(offset);

    const [result, total] = await Promise.all([query, this.count()]);

    const meta = buildPaginationMeta(total, page, pageSize);
    const links = buildPaginationLinks('/api/v1/users', page, pageSize, meta.totalPages);

    return {
      data: result.map((row) => this.toDomain(row)),
      meta,
      links,
    };
  }

  async count(): Promise<number> {
    const result = await this.database
      .select({ count: count() })
      .from(usersTable)
      .where(isNull(usersTable.deletedAt));
    return result[0]?.count ?? 0;
  }

  private buildOrderClauses(orderBy: SortOption<{ [K in UserSortField]: unknown }>[]) {
    const fieldMap = {
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      createdAt: usersTable.createdAt,
      updatedAt: usersTable.updatedAt,
    } as const;

    return orderBy.map(({ field, direction }) => {
      const column = fieldMap[field as UserSortField];
      return direction === 'desc' ? desc(column) : asc(column);
    });
  }

  private toDomain(dbUser: DbUser): User {
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
  }

  private toDb(user: User): NewDbUser {
    return {
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
      passwordHash: user.passwordHash,
    };
  }
}
