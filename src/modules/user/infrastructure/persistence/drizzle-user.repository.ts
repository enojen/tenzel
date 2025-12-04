import { eq } from 'drizzle-orm';

import { db } from '../../../../shared/infrastructure/database/drizzle';
import { User } from '../../domain/entities/user.entity';

import { usersTable } from './user.table';

import type { DbUser, NewDbUser } from './user.db-schemas';
import type { FindAllOptions, UserRepository } from '../../domain/repositories/user.repository';

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
    const query = this.database.select().from(usersTable);

    if (options?.limit) {
      query.limit(options.limit);
    }

    if (options?.offset) {
      query.offset(options.offset);
    }

    const result = await query;

    return result.map((row) => this.toDomain(row));
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
