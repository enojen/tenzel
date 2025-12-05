import type {
  FindAllOptions,
  UserRepository,
} from '@/modules/user/domain/repositories/user.repository';

import { User } from '@/modules/user/domain/entities/user.entity';

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
    let users = Array.from(this.users.values());

    if (options?.offset) {
      users = users.slice(options.offset);
    }

    if (options?.limit) {
      users = users.slice(0, options.limit);
    }

    return users;
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
