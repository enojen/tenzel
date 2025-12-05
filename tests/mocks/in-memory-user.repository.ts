import type {
  FindAllOptions,
  UserRepository,
  UserSortField,
} from '@/modules/user/domain/repositories/user.repository';
import type { PaginatedResult, PaginationParams, SortOption } from '@/shared/types';

import { User } from '@/modules/user/domain/entities/user.entity';
import { buildPaginationLinks, buildPaginationMeta } from '@/shared/types';

export class InMemoryUserRepository implements UserRepository {
  private users: Map<number, User> = new Map();
  private idCounter = 1;

  async findById(id: number): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async create(user: User): Promise<User> {
    const id = this.idCounter++;
    const now = new Date();

    const createdUser = User.create({
      id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
      passwordHash: user.passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    this.users.set(id, createdUser);
    return createdUser;
  }

  async update(user: User): Promise<User> {
    const id = user.id as number;
    if (!this.users.has(id)) {
      throw new Error('User not found');
    }

    const updatedUser = User.create({
      id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt,
      updatedAt: new Date(),
    });

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async findAll(options?: FindAllOptions): Promise<User[]> {
    let users = Array.from(this.users.values()).filter((u) => !u.isDeleted);

    if (options?.offset) {
      users = users.slice(options.offset);
    }

    if (options?.limit) {
      users = users.slice(0, options.limit);
    }

    return users;
  }

  async findAllPaginated(
    options: PaginationParams & { orderBy?: SortOption<{ [K in UserSortField]: unknown }>[] },
  ): Promise<PaginatedResult<User>> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    let users = Array.from(this.users.values()).filter((u) => !u.isDeleted);
    const total = users.length;

    users = users.slice(offset, offset + pageSize);

    const meta = buildPaginationMeta(total, page, pageSize);
    const links = buildPaginationLinks('/api/v1/users', page, pageSize, meta.totalPages);

    return { data: users, meta, links };
  }

  async count(): Promise<number> {
    return Array.from(this.users.values()).filter((u) => !u.isDeleted).length;
  }

  clear(): void {
    this.users.clear();
    this.idCounter = 1;
  }

  seed(users: User[]): void {
    for (const user of users) {
      const id = user.id as number;
      this.users.set(id, user);
      if (id >= this.idCounter) {
        this.idCounter = id + 1;
      }
    }
  }
}
